import { Box, Card, Text, Flex, Avatar, Dialog, Button, ScrollArea } from "@radix-ui/themes";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

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
}

export function MessageList({ messages, currentUser, userProfiles = {} }: MessageListProps) {

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

