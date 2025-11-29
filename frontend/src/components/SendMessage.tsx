import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Box, TextField, Button, Flex } from "@radix-ui/themes";
import { CHAT_ROOM_OBJECT_ID } from "../config";
import { Transaction } from "@mysten/sui/transactions";

interface SendMessageProps {
  onMessageSent: () => void;
}

export function SendMessage({ onMessageSent }: SendMessageProps) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim() || !account || CHAT_ROOM_OBJECT_ID === "0x0") {
      return;
    }

    const tx = new Transaction();
    
    // 獲取 Clock 對象
    const clock = tx.object("0x6");
    
    // 調用 send_message 函數
    tx.moveCall({
      target: `${import.meta.env.VITE_CHAT_PACKAGE_ID}::chat_contract::send_message`,
      arguments: [
        tx.object(CHAT_ROOM_OBJECT_ID),
        tx.pure.string(message),
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
          setMessage("");
          onMessageSent();
        },
        onError: (error: Error) => {
          console.error("發送訊息失敗:", error);
          alert("發送訊息失敗: " + error.message);
        },
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box>
      <Flex gap="2" align="center">
        <TextField.Root
          placeholder="輸入訊息..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isPending || !account}
          style={{
            flex: 1,
            border: "2px solid #3b82f6",
            borderRadius: "8px",
          }}
        />
        <Button
          onClick={handleSend}
          disabled={isPending || !message.trim() || !account}
        >
          {isPending ? "發送中..." : "發送"}
        </Button>
      </Flex>
    </Box>
  );
}

