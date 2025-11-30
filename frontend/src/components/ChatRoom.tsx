import { useCurrentAccount, useSuiClientQuery, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Text, Card } from "@radix-ui/themes";
import { MessageList } from "./MessageList";
import { SendMessage } from "./SendMessage";
import { UserProfile } from "./UserProfile";
import { CHAT_CONTRACT_PACKAGE_ID } from "../config"; // 只剩這個用 env
import { useEffect, useState, useCallback, useMemo } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useSubscribeToEvents } from "../hooks/useSubscribeToEvents";

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  readBy: string[];
  id?: string;
}

interface UserProfileMap {
  [address: string]: {
    username: string;
    avatarUrl: string;
  };
}

// ⭐ 新增：ChatRoom 的 props 型別
interface ChatRoomProps {
  roomId: string;     // Sui 上這個聊天室的 object ID
  roomName: string;   // 顯示用名稱
}

// ⭐ 改：讓 ChatRoom 接 props
export function ChatRoom({ roomId, roomName }: ChatRoomProps) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfileMap>({});
  const [hasMarkedAllRead, setHasMarkedAllRead] = useState(false);

  // 讀取指定 roomId 的 ChatRoom 對象（⭐這裡改 id）
  const { data: chatRoomData, refetch } = useSuiClientQuery(
    "getObject",
    {
      id: roomId,
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: !!roomId && roomId !== "0x0",
      // 移除輪詢，改用事件監聽
    }
  );

  // 訂閱智能合約事件，當有新訊息或已讀狀態變更時自動更新
  useSubscribeToEvents({
    client,
    onEvent: useCallback(() => {
      console.log("收到區塊鏈事件，重新獲取數據");
      refetch();
    }, [refetch]),
    enabled: !!roomId && roomId !== "0x0",
  });

  useEffect(() => {
    if (chatRoomData?.data?.content && "fields" in chatRoomData.data.content) {
      const fields = chatRoomData.data.content.fields as any;
      if (fields.messages && Array.isArray(fields.messages)) {
        const parsedMessages: Message[] = fields.messages.map((msg: any, index: number) => {
          const readBy = msg.fields?.read_by || msg.read_by || [];
          return {
            sender: msg.fields?.sender || msg.sender || "",
            text: msg.fields?.text || msg.text || "",
            timestamp: Number(msg.fields?.timestamp || msg.timestamp || 0),
            readBy: readBy,
            id: `msg_${index}`, // 添加 id 用於追蹤
          };
        });
        setMessages(parsedMessages);
        // 當有新訊息時，重置標記狀態
        setHasMarkedAllRead(false);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [chatRoomData]);

  // 將 readBy 轉換為 readStats 格式
  const readStats = useMemo(() => {
    const stats: { [messageId: string]: Set<string> } = {};
    messages.forEach((msg, index) => {
      const msgId = msg.id || `msg_${index}`;
      stats[msgId] = new Set(msg.readBy || []);
    });
    return stats;
  }, [messages]);

  // 查詢所有發送者的 Profile（這段保留）
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (!messages.length || CHAT_CONTRACT_PACKAGE_ID === "0x0") {
        return;
      }

      const uniqueAddresses = Array.from(
        new Set(messages.map((msg) => msg.sender).filter(Boolean))
      );

      if (uniqueAddresses.length === 0) {
        return;
      }

      const profilePromises = uniqueAddresses.map(async (address) => {
        try {
          const ownedObjects = await client.getOwnedObjects({
            owner: address,
            filter: {
              StructType: `${CHAT_CONTRACT_PACKAGE_ID}::chat_contract::Profile`,
            },
            options: {
              showContent: true,
              showType: true,
            },
          });

          if (ownedObjects.data && ownedObjects.data.length > 0) {
            const profile = ownedObjects.data[0];
            if (profile.data?.content && "fields" in profile.data.content) {
              const fields = profile.data.content.fields as any;
              return {
                address,
                username: fields.username || "",
                avatarUrl: fields.avatar_url || "",
              };
            }
          }
          return { address, username: "", avatarUrl: "" };
        } catch (error) {
          console.error(`查詢地址 ${address} 的 Profile 失敗:`, error);
          return { address, username: "", avatarUrl: "" };
        }
      });

      const profiles = await Promise.all(profilePromises);
      const profileMap: UserProfileMap = {};
      profiles.forEach((profile) => {
        if (profile.username) {
          profileMap[profile.address] = {
            username: profile.username,
            avatarUrl: profile.avatarUrl,
          };
        }
      });

      setUserProfiles(profileMap);
    };

    fetchUserProfiles();
  }, [messages, client]);

  // 批量標記所有未讀訊息為已讀（當最後一個訊息出現時調用）
  const markAllMessagesAsRead = useCallback(() => {
    if (!account || !roomId || roomId === "0x0" || hasMarkedAllRead) {
      return;
    }

    // 檢查是否有未讀訊息（不是自己發送的）
    const hasUnreadMessages = messages.some(
      (msg) => msg.sender !== account.address && !msg.readBy.includes(account.address)
    );

    if (!hasUnreadMessages) {
      console.log("沒有未讀訊息，跳過");
      setHasMarkedAllRead(true);
      return;
    }

    console.log("開始批量標記所有未讀訊息為已讀");
    setHasMarkedAllRead(true);

    const tx = new Transaction();
    const clock = tx.object("0x6");

    tx.moveCall({
      target: `${CHAT_CONTRACT_PACKAGE_ID}::chat_contract::mark_all_messages_as_read`,
      arguments: [
        tx.object(roomId),
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
          console.log("批量標記所有訊息為已讀成功，等待區塊鏈確認...");
          setTimeout(() => {
            refetch();
          }, 1000);
          setTimeout(() => {
            refetch();
          }, 3000);
        },
        onError: (error: Error) => {
          console.error("批量標記訊息已讀失敗:", error);
          setHasMarkedAllRead(false);
        },
      }
    );
  }, [account, roomId, messages, hasMarkedAllRead, signAndExecute, refetch]);

  // 單個訊息標記為已讀（用於 IntersectionObserver）
  const handleMarkAsRead = useCallback((messageId: string) => {
    // 這裡可以實現單個訊息的標記，但我們主要使用批量標記
    // 如果需要單個標記，可以在這裡實現
    console.log("標記訊息為已讀:", messageId);
  }, []);

  // 沒連錢包
  if (!account) {
    return (
      <Container>
        <Card style={{ padding: "1rem" }}>
          <Text>請先連接錢包以使用聊天室</Text>
        </Card>
      </Container>
    );
  }

  // ⭐ roomId 為空或 0x0 的狀況
  if (!roomId || roomId === "0x0") {
    return (
      <Container size="1" p="1" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <Card style={{ padding: "1rem", marginTop: "1rem" }}>
          <Heading size="4" mb="2">
            {roomName}
          </Heading>
          <Text>這個聊天室目前還沒開放，請贊助100USDC開啟。</Text>
        </Card>
      </Container>
    );
  }


  console.log(messages, account);

  return (
    <Container size="1" p="1" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <Flex
        direction="column"
        gap="1"
        style={{
          height: "calc(100vh - 80px)",
          maxHeight: "600px",
          minHeight: "500px",
        }}
      >
        {/* ⭐ 標題用 roomName */}
        <Flex justify="between" align="center" style={{ flexShrink: 0 }}>
          <Heading size="6">{roomName}</Heading>
          <UserProfile onProfileUpdate={() => refetch()} />
        </Flex>

        {/* 訊息列表 */}
        <Box style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          <MessageList
            messages={messages.map((msg, index) => ({
              ...msg,
              id: msg.id || `msg_${index}`,
            }))}
            currentUser={account.address}
            userProfiles={userProfiles}
            readStats={readStats}
            onMarkAsRead={handleMarkAsRead}
            onLastMessageVisible={markAllMessagesAsRead}
          />
        </Box>

        {/* 發送訊息 */}
        <Box style={{ flexShrink: 0 }}>
          <SendMessage
            onMessageSent={() => {
              refetch();
            }}
          />
        </Box>
      </Flex>
    </Container>
  );
}
