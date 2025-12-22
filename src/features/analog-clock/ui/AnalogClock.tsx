"use client";

import { useEffect, useState } from "react";

export default function AnalogClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourDegrees = hours * 30 + minutes * 0.5;
  const minuteDegrees = minutes * 6;
  const secondDegrees = seconds * 6;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* 文字盤 */}
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="currentColor"
          className="text-base-100"
        />
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-base-content/20"
        />

        {/* 時間マーカー（12個） */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 100 + 85 * Math.cos(angle);
          const y1 = 100 + 85 * Math.sin(angle);
          const x2 = 100 + 75 * Math.cos(angle);
          const y2 = 100 + 75 * Math.sin(angle);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={i % 3 === 0 ? "3" : "2"}
              strokeLinecap="round"
              className="text-base-content"
            />
          );
        })}

        {/* 時針 */}
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="55"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="text-base-content"
          transform={`rotate(${hourDegrees} 100 100)`}
        />

        {/* 分針 */}
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="35"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-base-content"
          transform={`rotate(${minuteDegrees} 100 100)`}
        />

        {/* 秒針 */}
        <line
          x1="100"
          y1="110"
          x2="100"
          y2="30"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-error"
          transform={`rotate(${secondDegrees} 100 100)`}
        />

        {/* 中心 */}
        <circle
          cx="100"
          cy="100"
          r="4"
          fill="currentColor"
          className="text-base-content"
        />
      </svg>
    </div>
  );
}
