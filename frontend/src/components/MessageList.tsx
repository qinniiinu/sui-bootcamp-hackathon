import { Box, Text, Flex, Avatar } from "@radix-ui/themes";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useEffect, useRef } from "react";

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  id?: string;
}

interface UserProfile {
  username: string;
  avatarUrl: string;
}

interface MessageListProps {
  messages: Message[];
  currentUser: string;
  userProfiles?: { [address: string]: UserProfile };
  readStats?: { [messageId: string]: Set<string> };
  onMarkAsRead?: (messageId: string) => void;
  onLastMessageVisible?: () => void;
}

export function MessageList({
  messages,
  currentUser,
  userProfiles = {},
  readStats = {},
  onMarkAsRead,
  onLastMessageVisible,
}: MessageListProps) {
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 格式化顯示名稱（可在這裡修改字樣）
  const formatDisplayName = (address: string) => {
    if (address === currentUser) return "你";
    const profile = userProfiles[address];
    if (profile?.username) return profile.username;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // IntersectionObserver 監聽最後一個訊息，當它出現時批量標記所有未讀
  useEffect(() => {
    if (!onLastMessageVisible || messages.length === 0) return;

    // 清理舊的 observer
    if (observerRef.current && lastMessageRef.current) {
      observerRef.current.unobserve(lastMessageRef.current);
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            console.log("最後一個訊息出現在畫面中，準備批量標記已讀");
            onLastMessageVisible();
          }
        });
      },
      { threshold: 0.5 } // 當 50% 的訊息可見時觸發
    );

    // 延遲觀察，確保 ref 已經設置
    const timer = setTimeout(() => {
      if (lastMessageRef.current && observerRef.current) {
        observerRef.current.observe(lastMessageRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observerRef.current && lastMessageRef.current) {
        observerRef.current.unobserve(lastMessageRef.current);
      }
    };
  }, [messages.length, onLastMessageVisible]);

  // 單個訊息的 IntersectionObserver（可選，用於單個標記）
  useEffect(() => {
    if (!onMarkAsRead) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute("data-message-id");
            if (messageId) onMarkAsRead(messageId);
          }
        });
      },
      { threshold: 0.5 }
    );

    messages.forEach((msg, idx) => {
      const id = msg.id || `msg_${idx}`;
      const el = messageRefs.current[id];
      // 不要觀察最後一個訊息，因為它由 lastMessageRef 處理
      if (el && idx < messages.length - 1) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [messages, onMarkAsRead]);

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
            const msgId = message.id || `msg_${index}`;
            const isOwnMessage = message.sender === currentUser;
            const messageDate = new Date(message.timestamp);
            const profile = userProfiles[message.sender];
            const displayName = formatDisplayName(message.sender);
            const readCount = readStats?.[msgId]?.size || 0;
            const isLastMessage = index === messages.length - 1;

            // 氣泡圓角：top-left, top-right, bottom-right, bottom-left
            const bubbleRadius = isOwnMessage
              ? "16px 16px 4px 16px" // 右側訊息（自己的）底右角小
              : "16px 16px 16px 4px"; // 左側訊息（他人的）底左角小

            return (
              <Flex
                key={msgId}
                justify={isOwnMessage ? "end" : "start"}
                style={{ width: "100%" }}
              >
                <Box
                  ref={(el) => {
                    messageRefs.current[msgId] = el;
                    // 如果是最後一個訊息，設置 lastMessageRef
                    if (isLastMessage) {
                      lastMessageRef.current = el;
                    }
                  }}
                  data-message-id={msgId}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-end",
                    maxWidth: "80%",
                  }}
                >
                  {!isOwnMessage && (
                    <Avatar
                      src={profile?.avatarUrl}
                      size="2"
                      fallback={profile?.username?.[0] || "U"}
                    />
                  )}

                  <Box
                    style={{
                      background: isOwnMessage ? "var(--accent-9)" : "var(--gray-3)",
                      color: isOwnMessage ? "white" : "var(--gray-12)",
                      padding: "0.6rem 0.9rem",
                      borderRadius: bubbleRadius,
                      boxShadow: isOwnMessage
                        ? "0 6px 18px rgba(0,0,0,0.18)"
                        : "0 4px 12px rgba(0,0,0,0.12)",
                      wordBreak: "break-word",
                    }}
                  >
                    <Flex direction="column" gap="4">
                      {!isOwnMessage && (
                        <Flex align="center" gap="8" style={{ marginBottom: 4 }}>
                          <Text size="1" weight="bold" style={{ opacity: 0.9 }}>
                            {displayName}
                          </Text>
                        </Flex>
                      )}

                      <Text size="3" style={{ lineHeight: 1.4 }}>
                        {message.text}
                      </Text>

                      <Flex justify="between" align="center" style={{ marginTop: 6 }}>
                        <Text size="1" style={{ opacity: 0.7 }}>
                          {formatDistanceToNow(messageDate, {
                            addSuffix: true,
                            locale: zhTW,
                          })}
                        </Text>
                        {isOwnMessage && (
                          <Text size="1" style={{ opacity: 0.8, marginLeft: 8 }}>
                            👁️ {readCount}
                          </Text>
                        )}
                      </Flex>
                    </Flex>
                  </Box>

                  {isOwnMessage && (
                    // 保留空位或 avatar 替代物，使右側訊息對齊漂亮
                    <div style={{ width: 32 }} />
                  )}
                </Box>
              </Flex>
            );
          })}
        </Flex>
      )}
    </Box>
  );
}

