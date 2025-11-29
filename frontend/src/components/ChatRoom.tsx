import { useCurrentAccount, useSuiClientQuery, useSuiClient } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Text, Card } from "@radix-ui/themes";
import { MessageList } from "./MessageList";
import { SendMessage } from "./SendMessage";
import { UserProfile } from "./UserProfile";
import { CHAT_CONTRACT_PACKAGE_ID } from "../config"; // 只剩這個用 env
import { useEffect, useState } from "react";

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  readBy: string[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfileMap>({});

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
      refetchInterval: 3000,
    }
  );

  useEffect(() => {
    if (chatRoomData?.data?.content && "fields" in chatRoomData.data.content) {
      const fields = chatRoomData.data.content.fields as any;
      if (fields.messages && Array.isArray(fields.messages)) {
        const parsedMessages: Message[] = fields.messages.map((msg: any, index: number) => {
          const readBy = msg.fields?.read_by || msg.read_by || [];
          console.log(`訊息 ${index} 的 read_by:`, readBy);
          return {
            sender: msg.fields?.sender || msg.sender || "",
            text: msg.fields?.text || msg.text || "",
            timestamp: Number(msg.fields?.timestamp || msg.timestamp || 0),
            readBy: readBy,
          };
        });
        console.log("解析後的訊息:", parsedMessages);
        setMessages(parsedMessages);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [chatRoomData]);

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
            messages={messages}
            currentUser={account.address}
            userProfiles={userProfiles}
            roomId={roomId}
            onMessageRead={() => refetch()}
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
