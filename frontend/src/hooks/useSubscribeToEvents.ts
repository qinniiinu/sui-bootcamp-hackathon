import { useEffect, useRef } from "react";
import { SuiClient } from "@mysten/sui/client";
import { CHAT_CONTRACT_PACKAGE_ID } from "../config";

interface UseSubscribeToEventsProps {
  client: SuiClient;
  onEvent: () => void;
  enabled?: boolean;
}

/**
 * 訂閱智能合約事件的自定義 Hook
 * 監聽 MessagePosted、MessageRead 和 ProfileUpdated 事件
 */
export function useSubscribeToEvents({
  client,
  onEvent,
  enabled = true,
}: UseSubscribeToEventsProps) {
  const unsubscribeRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    if (!enabled || CHAT_CONTRACT_PACKAGE_ID === "0x0") {
      return;
    }

    let isSubscribed = true;

    const subscribe = async () => {
      try {
        console.log("正在訂閱智能合約事件...");

        const unsubscribe = await client.subscribeEvent({
          filter: {
            MoveModule: {
              package: CHAT_CONTRACT_PACKAGE_ID,
              module: "chat_contract",
            },
          },
          onMessage: (event) => {
            if (!isSubscribed) return;

            console.log("收到事件:", event);

            // 解析事件類型
            const eventType = event.type;

            if (
              eventType.includes("::MessagePosted") ||
              eventType.includes("::MessageRead") ||
              eventType.includes("::ProfileUpdated")
            ) {
              console.log(`觸發 ${eventType} 事件，重新獲取數據`);
              onEvent();
            }
          },
        });

        unsubscribeRef.current = unsubscribe;
        console.log("成功訂閱智能合約事件");
      } catch (error) {
        console.error("訂閱事件失敗:", error);
        // 訂閱失敗時，作為後備方案，可以考慮回退到輪詢
        // 但在這裡我們只記錄錯誤
      }
    };

    subscribe();

    return () => {
      isSubscribed = false;
      if (unsubscribeRef.current) {
        console.log("取消訂閱智能合約事件");
        unsubscribeRef.current().catch((err) => {
          console.error("取消訂閱失敗:", err);
        });
        unsubscribeRef.current = null;
      }
    };
  }, [client, onEvent, enabled]);
}

