import { useState } from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { ChatRoom } from "./components/ChatRoom";
import { CHAT_ROOM_OBJECT_ID } from "./config";

type Room = {
  id: string;    // 如果是 "0x0" 就代表還沒串到鏈上
  name: string;
};

function App() {
    const [rooms] = useState<Room[]>([
      {
        // 串接你原本的鏈上聊天室
        id: CHAT_ROOM_OBJECT_ID,
        name: "一般聊天室",
      },
      {
        // 目前空的：未啟用
        id: "0x0",
        name: "技術討論",
      },
      {
        id: "0x0",
        name: "閒聊區",
      },
    ]);

    const [activeRoomId, setActiveRoomId] = useState<string>(rooms[0].id);
    const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];

    return (
      <div style={{ background: "rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(10px)"
                  }}>
        {/* 上方 navbar */}
        <Flex
          position="sticky"
          px="4"
          py="2"
          justify="between"
          style={{
            borderBottom: "1px solid var(--gray-a2)",
            zIndex: 1000,
            background: "var(--gray-1)",
          }}
        >
          <Box>
            <Heading>聊天室 dApp</Heading>
          </Box>

          <Box>
            <ConnectButton />
          </Box>
        </Flex>

        {/* 左右 layout */}
        <Flex style={{ height: "calc(100vh - 56px)" }}>
          {/* 左側：聊天室列表 */}
          <Box
            style={{
              width: 220,
              borderRight: "1px solid var(--gray-a3)",
              background: "var(--gray-2)",
            }}
          >
            <Box p="3">
              <Text
                weight="bold"
                style={{
                  color: "#2563eb" ,   // 自訂紫色（Tailwind purple-600）
                  fontWeight: 700,    // 字更粗
                  fontSize: "23px",   // 字變大（選填）
                }}
              >
                聊天室列表
              </Text>
            </Box>



            {rooms.map((room) => (
              <Box
                key={room.name}
                px="3"
                py="2"
                style={{
                  cursor: "pointer",
                  background:
                    room.id === activeRoomId ? "var(--gray-4)" : "transparent",
                }}
                onClick={() => setActiveRoomId(room.id)}
              >
                <Text>{room.name}</Text>
              </Box>
            ))}
          </Box>

          {/* 右側：目前選到的聊天室內容 */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <ChatRoom roomId={activeRoom.id} roomName={activeRoom.name} />
          </Box>
        </Flex>
      </div>
    );
}

export default App;
