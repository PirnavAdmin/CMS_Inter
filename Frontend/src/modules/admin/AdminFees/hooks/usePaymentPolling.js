import { useEffect, useRef, useState } from "react";
import { feePaymentGatewayApi } from "@/api/feePaymentGatewayApi.js";
import { startPaymentPolling } from "../services/paymentGatewaySession.js";

export function usePaymentPolling(order, attempt, onSuccess) {
  const successRef = useRef(onSuccess);
  useEffect(() => {
    successRef.current = onSuccess;
  }, [onSuccess]);
  const [state, setState] = useState({ status: "IDLE", error: "" });
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!order) {
      setState({ status: "IDLE", error: "" });
      return;
    }
    if (order.requiresManualUtr) {
      setState({ status: "MANUAL_UTR", error: "" });
      setSecondsLeft(0);
      return;
    }
    const timeoutMs = Number(order.monitoringTimeoutSeconds || 600) * 1000;
    const deadline = Math.min(Date.now() + timeoutMs, order.expiresAt || Infinity);
    setState({ status: "PENDING", error: "" });
    const updateCountdown = () =>
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    updateCountdown();
    const countdown = window.setInterval(updateCountdown, 1000);
    const stop = startPaymentPolling({
      order,
      timeoutMs,
      intervalMs: Number(order.pollingIntervalMs || 1200),
      probe: (signal) => feePaymentGatewayApi.status(order.studentFeeId, order.orderId, signal),
      onUpdate: (next) => {
        setState(next);
        if (next.status !== "PENDING") window.clearInterval(countdown);
      },
      onSuccess: (payment) => successRef.current(payment),
    });
    return () => {
      stop();
      window.clearInterval(countdown);
    };
  }, [order, attempt]);
  return { ...state, secondsLeft };
}
