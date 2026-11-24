import React, { useState, useRef, useEffect } from 'react';
import { Lock, ArrowRight, AlertCircle, Utensils } from 'lucide-react';

interface PinGateProps {
  restaurantName: string;
  tableLabel: string;
  onVerify: (pin: string) => Promise<{ success: boolean; message?: string }>;
}

export const PinGate: React.FC<PinGateProps> = ({
  restaurantName,
  tableLabel,
  onVerify
}) => {
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric single characters
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = char;
    setPinDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance to next input
    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullPin = pinDigits.join('');

    if (fullPin.length !== 4) {
      setErrorMessage('Please enter all 4 digits of your table PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await onVerify(fullPin);
      if (!res.success) {
        setErrorMessage(res.message || 'Incorrect PIN.');
        setPinDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch {
      setErrorMessage('Network error verifying PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col justify-between bg-slate-900 text-white p-6 overflow-y-auto">
      {/* Top Header */}
      <div className="pt-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300">
          <Utensils className="w-3.5 h-3.5 text-orange-400" />
          <span>{restaurantName}</span>
        </div>
      </div>

      {/* Centered PIN Card */}
      <div className="w-full max-w-sm mx-auto my-auto text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shadow-lg">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-white">{tableLabel}</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Please enter the 4-digit seating PIN shown on your table card or provided by your waiter.
          </p>
        </div>

        {/* 4-Digit Numeric Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-3">
            {pinDigits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-16 text-center text-2xl font-mono font-bold bg-slate-800 border-2 border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition shadow-inner"
              />
            ))}
          </div>

          {errorMessage && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-lg animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || pinDigits.join('').length !== 4}
            className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Verifying...</span>
            ) : (
              <>
                <span>Unlock Table</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Bottom Safety Note */}
      <div className="pb-4 text-center">
        <p className="text-[11px] text-slate-500">
          Need help? Wave to your server or ask for assistance.
        </p>
      </div>
    </div>
  );
};

export default PinGate;
