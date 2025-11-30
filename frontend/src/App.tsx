import { useEffect, useMemo, useState } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Text, Separator } from "@radix-ui/themes";
import { ChatRoom } from "./components/ChatRoom";
import { CHAT_ROOM_OBJECT_ID } from "./config";

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { ZKLoginProvider, ZKLogin, useZKLogin } from "react-sui-zk-login-kit";
import { generateRandomness } from "@mysten/sui/zklogin";

type Room = {
  id: string;
  name: string;
};

const GOOGLE_CLIENT_ID = "73850711498-hk92uj0bn8ve6or94ktksgnupas877t4.apps.googleusercontent.com";
const FULLNODE_URL = getFullnodeUrl("testnet");
const suiClient = new SuiClient({ url: FULLNODE_URL });
const SUI_PROVER_ENDPOINT = "https://prover-dev.mystenlabs.com/v1";

const providers = {
  google: {
    clientId: GOOGLE_CLIENT_ID,
    redirectURI: window.location.origin,
  },
};

function ChatApp() {
  const [rooms] = useState<Room[]>([
    {
      id: CHAT_ROOM_OBJECT_ID,
      name: "一般聊天室",
    },
    {
      id: "room-2",
      name: "技術討論",
    },
    {
      id: "room-3",
      name: "閒聊區",
    },
  ]);

  const [activeRoomId, setActiveRoomId] = useState<string>(rooms[0].id);
  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];

  // ✅ 從 dApp Kit 抓錢包帳號
  const currentWalletAccount = useCurrentAccount();

  // ✅ 從 zkLogin 取得狀態
  const {
    encodedJwt,
    address: zkAddress,
    userSalt,
    setUserSalt,
  } = useZKLogin();

  // ✅ 第一次拿到 JWT 時，生成 salt 並存到 localStorage
  useEffect(() => {
    if (!encodedJwt) return;

    const key = "zklogin_user_salt";
    let salt = localStorage.getItem(key);
    if (!salt) {
      salt = generateRandomness();
      localStorage.setItem(key, String(salt));
    }
    if (userSalt !== salt) {
      setUserSalt(String(salt));
    }
  }, [encodedJwt, userSalt, setUserSalt]);

  // ✅ 統一「目前使用中的 address」：優先 zkLogin，其次錢包
  const currentAddress = useMemo(
    () => zkAddress ?? currentWalletAccount?.address ?? null,
    [zkAddress, currentWalletAccount]
  );

  // ✅ 檢查是否已登入（Google zkLogin 或錢包連接）
  const isLoggedIn = !!currentAddress;

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* 上方 navbar */}
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
        align="center"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
          zIndex: 1000,
          background: "var(--gray-1)",
        }}
      >
        <Box>
          <Heading>聊天室 dApp</Heading>
        </Box>

        <Box
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Google zkLogin 按鈕 */}
          <ZKLogin
            providers={providers}
            proverProvider={SUI_PROVER_ENDPOINT}
            title={zkAddress ? "切換 Google 帳號" : "Google 登入"}
            subTitle="使用 Google 帳號產生 Sui zkLogin address"
          />

          {/* 錢包連接按鈕 */}
          <ConnectButton />

          {/* ✅ 顯示目前登入狀態 */}
          {currentAddress && (
            <Text size="2" color="gray">
              {zkAddress ? "✓ Google 登入" : "✓ 錢包已連接"}
            </Text>
          )}
        </Box>
      </Flex>

      {/* ✅ 檢查是否登入 */}
      {!isLoggedIn ? (
        <Flex
          justify="center"
          align="center"
          style={{
            height: "calc(100vh - 56px)",
            background: "var(--gray-2)",
          }}
        >
          <Box style={{ textAlign: "center" }}>
            <Heading size="5" mb="3">
              請登入以使用聊天室
            </Heading>
            <Text color="gray">
              點擊右上角「Google 登入」或「Connect」按鈕連接你的帳戶
            </Text>
          </Box>
        </Flex>
      ) : (
        /* ✅ 已登入：顯示聊天室列表 + 聊天窗口 */
        <Flex style={{ height: "calc(100vh - 56px)" }}>
          {/* 左側：聊天室列表 */}
          <Box
            style={{
              width: 220,
              borderRight: "1px solid var(--gray-a3)",
              background: "var(--gray-2)",
              overflowY: "auto",
            }}
          >
            <Box p="3">
              <Text
                weight="bold"
                style={{
                  color: "#2563eb",
                  fontWeight: 700,
                  fontSize: "23px",
                }}
              >
                聊天室列表
              </Text>
            </Box>

            {/* 第一個房間 */}
            <Box
              px="3"
              py="2"
              style={{
                cursor: "pointer",
                background:
                  rooms[0].id === activeRoomId ? "var(--gray-4)" : "transparent",
              }}
              onClick={() => setActiveRoomId(rooms[0].id)}
            >
              <Text>{rooms[0].name}</Text>
            </Box>

            {/* 分隔線 */}
            <Separator my="2" />

            {/* 第二個房間 */}
            <Box
              px="3"
              py="2"
              style={{
                cursor: "pointer",
                background:
                  rooms[1].id === activeRoomId ? "var(--gray-4)" : "transparent",
              }}
              onClick={() => setActiveRoomId(rooms[1].id)}
            >
              <Text>{rooms[1].name}</Text>
            </Box>

            {/* 分隔線 */}
            <Separator my="2" />

            {/* 第三個房間 */}
            <Box
              px="3"
              py="2"
              style={{
                cursor: "pointer",
                background:
                  rooms[2].id === activeRoomId ? "var(--gray-4)" : "transparent",
              }}
              onClick={() => setActiveRoomId(rooms[2].id)}
            >
              <Text>{rooms[2].name}</Text>
            </Box>
          </Box>

          {/* 右側：目前選到的聊天室內容 */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <ChatRoom
              roomId={activeRoom.id}
              roomName={activeRoom.name}
            />
          </Box>
        </Flex>
      )}
    </div>
  );
}

// ✅ 保留 ZKLoginProvider
export default function App() {
  return (
    <ZKLoginProvider client={suiClient}>
      <ChatApp />
    </ZKLoginProvider>
  );
}
