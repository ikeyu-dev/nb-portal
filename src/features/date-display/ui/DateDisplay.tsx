"use client";

import { useState, useEffect } from "react";

export function DateDisplay() {
    const [dateInfo, setDateInfo] = useState<{
        dateString: string;
        dayOfWeek: string;
    } | null>(null);

    useEffect(() => {
        const updateDate = () => {
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth() + 1;
            const todayDate = today.getDate();
            const dateString = `${todayYear}年${String(todayMonth).padStart(
                2,
                "0"
            )}月${String(todayDate).padStart(2, "0")}日`;
            const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][
                today.getDay()
            ];
            setDateInfo({ dateString, dayOfWeek });
        };

        updateDate();

        // 毎分更新して日付が変わったときに対応
        const interval = setInterval(updateDate, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!dateInfo) {
        return <span className="loading loading-dots loading-sm"></span>;
    }

    return (
        <>
            {dateInfo.dateString} ({dateInfo.dayOfWeek})
        </>
    );
}

export default DateDisplay;
