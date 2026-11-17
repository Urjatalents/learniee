"use client";

import { useState } from "react";

import PdDialog from "@/features/parent/components/courses/PdDialog";
import { PD_BTN_PRI, PD_BTN_SEC, PD_ERR, PD_INPUT, PD_LABEL } from "@/features/parent/components/courses/pdUi";
import { WALLET_TOPUP_MAX_AMOUNT, WALLET_TOPUP_MIN_AMOUNT } from "@/features/parent/hooks/useWallet";
import { inr0, inr2 } from "@/features/parent/components/payments/paymentsUi";

const PRESETS = [500, 1000, 2000, 5000];

/**
 * Design `addMoneyDialog`. Validates the amount, then hands it to `onPay`, which closes this dialog
 * before Razorpay opens (a native modal dialog would sit on top of the checkout otherwise).
 */
export default function AddMoneyDialog({
  balance,
  onPay,
  onClose,
}: {
  balance: number;
  onPay: (amount: number) => void;
  onClose: () => void;
}) {
  const [preset, setPreset] = useState(1000);
  const [custom, setCustom] = useState("");
  const [err, setErr] = useState("");

  function pay() {
    const amount = custom.trim() ? Number(custom) : preset;

    if (!Number.isFinite(amount) || amount < WALLET_TOPUP_MIN_AMOUNT || amount > WALLET_TOPUP_MAX_AMOUNT) {
      setErr(`Enter an amount between ${inr0(WALLET_TOPUP_MIN_AMOUNT)} and ${inr0(WALLET_TOPUP_MAX_AMOUNT)}.`);
      return;
    }
    setErr("");
    onPay(amount);
  }

  return (
    <PdDialog
      title="Add money"
      onClose={onClose}
      inlineFooter
      footer={
        <>
          <button type="button" onClick={onClose} className={PD_BTN_SEC}>
            Cancel
          </button>
          <button type="button" onClick={pay} className={PD_BTN_PRI}>
            Pay
          </button>
        </>
      }
    >
      <p className="text-[13px] text-pd-ink3">
        Current balance <b className="font-semibold text-pd-ink">{inr2(balance)}</b>
      </p>

      <div role="radiogroup" aria-label="Amount" className="flex flex-col gap-2">
        {PRESETS.map((a) => (
          <label
            key={a}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-pd-line px-4 py-3 text-sm font-bold hover:border-pd-brand has-checked:border-pd-brand has-checked:bg-pd-b50"
          >
            <input
              type="radio"
              name="amt"
              value={a}
              checked={!custom.trim() && preset === a}
              onChange={() => {
                setPreset(a);
                setCustom("");
              }}
              className="size-[18px] accent-pd-brand"
            />
            {inr0(a)}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="amtc" className={PD_LABEL}>
          Or enter an amount ({inr0(WALLET_TOPUP_MIN_AMOUNT)}–{inr0(WALLET_TOPUP_MAX_AMOUNT)})
        </label>
        <input
          id="amtc"
          type="number"
          min={WALLET_TOPUP_MIN_AMOUNT}
          max={WALLET_TOPUP_MAX_AMOUNT}
          inputMode="numeric"
          placeholder="Custom amount"
          value={custom}
          aria-invalid={err ? true : undefined}
          onChange={(e) => setCustom(e.target.value)}
          className={PD_INPUT}
        />
        {err && <span className={PD_ERR}>{err}</span>}
      </div>

      <p className="text-[13px] text-pd-ink3">GST and any UPI charge are shown before you pay.</p>
    </PdDialog>
  );
}
