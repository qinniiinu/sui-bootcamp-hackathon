import { Box, Card, Text, Flex, Avatar, Dialog, Button, ScrollArea } from "@radix-ui/themes";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  readBy: string[];
}

interface UserProfile {
  username: string;
  avatarUrl: string;
}

interface MessageListProps {
  messages: Message[];
  currentUser: string;
  userProfiles?: { [address: string]: UserProfile };
  roomId: string;
  onMessageRead: () => void;
}

export function MessageList({ messages, currentUser, userProfiles = {}, roomId, onMessageRead }: MessageListProps) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [markedMessages, setMarkedMessages] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const messagesRef = useRef(messages);
  const currentUserRef = useRef(currentUser);
  const markedMessagesRef = useRef(markedMessages);

  // 更新 refs
  useEffect(() => {
    messagesRef.current = messages;
    currentUserRef.current = currentUser;
    markedMessagesRef.current = markedMessages;
  }, [messages, currentUser, markedMessages]);

  // 標記訊息為已讀的函數
  const markMessageAsRead = (messageIndex: number) => {
    // 檢查是否已經標記過或正在處理中
    if (markedMessagesRef.current.has(messageIndex)) {
      console.log(`訊息 ${messageIndex} 已經標記過，跳過`);
      return;
    }

    const message = messagesRef.current[messageIndex];
    
    // 檢查當前使用者是否已在已讀列表中
    if (message.readBy.includes(currentUserRef.current)) {
      console.log(`訊息 ${messageIndex} 當前使用者已在已讀列表中`);
      setMarkedMessages(prev => new Set(prev).add(messageIndex));
      return;
    }

    // 標記為處理中
    console.log(`開始標記訊息 ${messageIndex} 為已讀`);
    setMarkedMessages(prev => new Set(prev).add(messageIndex));

    const tx = new Transaction();
    const clock = tx.object("0x6");

    tx.moveCall({
      target: `${import.meta.env.VITE_CHAT_PACKAGE_ID}::chat_contract::mark_message_as_read`,
      arguments: [
        tx.object(roomId),
        tx.pure.u64(messageIndex),
        clock,
      ],
    });

    signAndExecute(
      {
        transaction: tx,
        chain: "sui:testnet",
      },
      {
        onSuccess: () => {
          console.log(`訊息 ${messageIndex} 已標記為已讀成功，等待區塊鏈確認...`);
          // 延遲一下再 refetch，確保交易已經上鏈
          setTimeout(() => {
            onMessageRead();
            console.log(`訊息 ${messageIndex} 觸發 refetch`);
          }, 1000);
          // 再次 refetch 確保拿到最新資料
          setTimeout(() => {
            onMessageRead();
            console.log(`訊息 ${messageIndex} 第二次 refetch`);
          }, 3000);
        },
        onError: (error: Error) => {
          console.error(`標記訊息 ${messageIndex} 已讀失敗:`, error);
          // 失敗時從標記集合中移除
          setMarkedMessages(prev => {
            const newSet = new Set(prev);
            newSet.delete(messageIndex);
            return newSet;
          });
        },
      }
    );
  };

  // 設置 Intersection Observer (只創建一次)
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-message-index") || "-1");
            if (index >= 0 && index < messagesRef.current.length) {
              const message = messagesRef.current[index];
              // 只標記別人的訊息
              if (message.sender !== currentUserRef.current) {
                console.log(`訊息 ${index} 進入可視區域，準備標記已讀`);
                markMessageAsRead(index);
              }
            }
          }
        });
      },
      {
        threshold: 0.5, // 當 50% 的訊息可見時觸發
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []); // 只在組件掛載時創建一次

  // 為訊息元素註冊觀察
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const setMessageRef = (index: number) => (element: HTMLDivElement | null) => {
    if (element) {
      messageRefs.current.set(index, element);
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      const existingElement = messageRefs.current.get(index);
      if (existingElement && observerRef.current) {
        observerRef.current.unobserve(existingElement);
      }
      messageRefs.current.delete(index);
    }
  };

  return (
    <Box
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "1rem",
        background: "rgb(100, 100, 100)",
        borderRadius: "var(--radius-3)",
      }}
    >
      {messages.length === 0 ? (
        <Flex justify="center" align="center" style={{ height: "100%" }}>
          <Text color="gray">還沒有訊息，開始聊天吧！</Text>
        </Flex>
      ) : (
        <Flex direction="column" gap="3">
          {messages.map((message, index) => {
            const isOwnMessage = message.sender === currentUser;
            const messageDate = new Date(message.timestamp);
            const profile = userProfiles[message.sender];
            const displayName = profile?.username || `${message.sender.slice(0, 8)}...${message.sender.slice(-6)}`;
            const readCount = message.readBy.length;
            console.log(readCount);
            return (
              <Flex
                key={index}
                justify={isOwnMessage ? "end" : "start"}
                style={{ width: "100%" }}
                ref={setMessageRef(index)}
                data-message-index={index}
              >
                <Card
                  style={{
                    maxWidth: "70%",
                    padding: "0.75rem 1rem",
                    background: isOwnMessage
                      ? "var(--accent-9)"
                      : "var(--gray-3)",
                    color: isOwnMessage ? "white" : "var(--gray-12)",
                  }}
                >
                  <Flex direction="column" gap="1">
                    {!isOwnMessage && (
                      <Flex align="center" gap="2">
                        {profile?.avatarUrl && (
                          <Avatar 
                            src={profile.avatarUrl} 
                            size="1" 
                            fallback={profile.username[0] || "U"} 
                          />
                        )}
                        <Text size="1" weight="bold" style={{ opacity: 0.8 }}>
                          {displayName}
                        </Text>
                      </Flex>
                    )}
                    <Text size="3">{message.text}</Text>
                    <Flex justify="between" align="center" style={{ marginTop: "0.25rem" }}>
                      <Text
                        size="1"
                        style={{
                          opacity: 0.7,
                        }}
                      >
                        {formatDistanceToNow(messageDate, {
                          addSuffix: true,
                          locale: zhTW,
                        })}
                      </Text>
                      {isOwnMessage && readCount > 0 && (
                        <Dialog.Root>
                          <Dialog.Trigger>
                            <Text
                              size="1"
                              style={{
                                opacity: 0.8,
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              已讀 {readCount} 人
                            </Text>
                          </Dialog.Trigger>
                          <Dialog.Content style={{ maxWidth: 450 }}>
                            <Dialog.Title>已讀名單</Dialog.Title>
                            <ScrollArea style={{ maxHeight: 400 }}>
                              <Flex direction="column" gap="2" style={{ marginTop: "1rem" }}>
                                {message.readBy.map((readerAddress) => {
                                  const readerProfile = userProfiles[readerAddress];
                                  const readerName = readerProfile?.username || 
                                    `${readerAddress.slice(0, 8)}...${readerAddress.slice(-6)}`;
                                  
                                  return (
                                    <Flex key={readerAddress} align="center" gap="2">
                                      {readerProfile?.avatarUrl ? (
                                        <Avatar 
                                          src={readerProfile.avatarUrl} 
                                          size="2" 
                                          fallback={readerProfile.username[0] || "U"} 
                                        />
                                      ) : (
                                        <Avatar 
                                          size="2" 
                                          fallback={readerName[0] || "U"} 
                                        />
                                      )}
                                      <Text>{readerName}</Text>
                                    </Flex>
                                  );
                                })}
                              </Flex>
                            </ScrollArea>
                            <Flex gap="3" mt="4" justify="end">
                              <Dialog.Close>
                                <Button variant="soft" color="gray">
                                  關閉
                                </Button>
                              </Dialog.Close>
                            </Flex>
                          </Dialog.Content>
                        </Dialog.Root>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              </Flex>
            );
          })}
        </Flex>
      )}
    </Box>
  );
}

