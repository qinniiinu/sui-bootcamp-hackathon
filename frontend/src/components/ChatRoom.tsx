import { useCurrentAccount, useSuiClientQuery, useSuiClient } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Text, Card } from "@radix-ui/themes";
import { MessageList } from "./MessageList";
import { SendMessage } from "./SendMessage";
import { UserProfile } from "./UserProfile";
import { CHAT_ROOM_OBJECT_ID, CHAT_CONTRACT_PACKAGE_ID } from "../config";
import { useEffect, useState } from "react";

interface Message {
  sender: string;
  text: string;
  timestamp: number;
}

interface UserProfileMap {
  [address: string]: {
    username: string;
    avatarUrl: string;
  };
}

export function ChatRoom() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfileMap>({});

  // 讀取 ChatRoom 對象
  const { data: chatRoomData, refetch } = useSuiClientQuery(
    "getObject",
    {
      id: CHAT_ROOM_OBJECT_ID,
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: CHAT_ROOM_OBJECT_ID !== "0x0",
      refetchInterval: 3000, // 每 3 秒刷新一次
    }
  );

  useEffect(() => {
    if (chatRoomData?.data?.content && "fields" in chatRoomData.data.content) {
      const fields = chatRoomData.data.content.fields as any;
      if (fields.messages && Array.isArray(fields.messages)) {
        const parsedMessages: Message[] = fields.messages.map((msg: any) => ({
          sender: msg.fields?.sender || msg.sender || "",
          text: msg.fields?.text || msg.text || "",
          timestamp: Number(msg.fields?.timestamp || msg.timestamp || 0),
        }));
        setMessages(parsedMessages);
      }
    }
  }, [chatRoomData]);

  // 查詢所有發送者的 Profile
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (!messages.length || CHAT_CONTRACT_PACKAGE_ID === "0x0") {
        return;
      }

      // 收集所有唯一的發送者地址
      const uniqueAddresses = Array.from(
        new Set(messages.map((msg) => msg.sender).filter(Boolean))
      );

      if (uniqueAddresses.length === 0) {
        return;
      }

      // 為每個地址查詢 Profile
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
            if (
              profile.data?.content &&
              "fields" in profile.data.content
            ) {
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

  if (!account) {
    return (
      <Container>
        <Card style={{ padding: "1rem" }}>
          <Text>請先連接錢包以使用聊天室</Text>
        </Card>
      </Container>
    );
  }

  if (CHAT_ROOM_OBJECT_ID === "0x0") {
    return (
      <Container>
        <Card style={{ padding: "1rem" }}>
          <Text color="red">
            請在 .env 文件中設置 VITE_CHAT_ROOM_ID
          </Text>
        </Card>
      </Container>
    );
  }

  console.log(messages ,account);


  return (
    <Container size="3" p="4" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <Flex 
        direction="column" 
        gap="4" 
        style={{ 
          height: "calc(100vh - 80px)",
          maxHeight: "800px",
          minHeight: "500px"
        }}
      >
        {/* 標題和用戶資料 */}
        <Flex justify="between" align="center" style={{ flexShrink: 0 }}>
          <Heading size="6">聊天室</Heading>
          <UserProfile onProfileUpdate={() => refetch()} />
        </Flex>
        {/* 訊息列表 */}
        <Box style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          <MessageList 
            messages={messages} 
            currentUser={account.address}
            userProfiles={userProfiles}
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

