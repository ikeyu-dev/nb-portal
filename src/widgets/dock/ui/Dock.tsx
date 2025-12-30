"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Dock() {
    const pathname = usePathname();

    return (
        <div
            className="dock dock-md fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-base-100 border-t border-base-300 pt-9"
            style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
            }}
        >
            <Link
                href="/home"
                className={`transition-transform ${
                    pathname === "/home" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M304 70.1C313.1 61.9 326.9 61.9 336 70.1L568 278.1C577.9 286.9 578.7 302.1 569.8 312C560.9 321.9 545.8 322.7 535.9 313.8L527.9 306.6L527.9 511.9C527.9 547.2 499.2 575.9 463.9 575.9L175.9 575.9C140.6 575.9 111.9 547.2 111.9 511.9L111.9 306.6L103.9 313.8C94 322.6 78.9 321.8 70 312C61.1 302.2 62 287 71.8 278.1L304 70.1zM320 120.2L160 263.7L160 512C160 520.8 167.2 528 176 528L224 528L224 424C224 384.2 256.2 352 296 352L344 352C383.8 352 416 384.2 416 424L416 528L464 528C472.8 528 480 520.8 480 512L480 263.7L320 120.3zM272 528L368 528L368 424C368 410.7 357.3 400 344 400L296 400C282.7 400 272 410.7 272 424L272 528z" />
                </svg>
                <span
                    className="dock-label"
                    style={{ fontSize: "clamp(0.625rem, 2vw, 0.75rem)" }}
                >
                    Home
                </span>
            </Link>

            <Link
                href="/calendar"
                className={`transition-transform ${
                    pathname === "/calendar" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M216 64C229.3 64 240 74.7 240 88L240 128L400 128L400 88C400 74.7 410.7 64 424 64C437.3 64 448 74.7 448 88L448 128L480 128C515.3 128 544 156.7 544 192L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 192C96 156.7 124.7 128 160 128L192 128L192 88C192 74.7 202.7 64 216 64zM216 176L160 176C151.2 176 144 183.2 144 192L144 240L496 240L496 192C496 183.2 488.8 176 480 176L216 176zM144 288L144 480C144 488.8 151.2 496 160 496L480 496C488.8 496 496 488.8 496 480L496 288L144 288z" />
                </svg>
                <span
                    className="dock-label"
                    style={{ fontSize: "clamp(0.625rem, 2vw, 0.75rem)" }}
                >
                    Calendar
                </span>
            </Link>

            <Link
                href="/items"
                className={`transition-transform ${
                    pathname === "/items" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M320 64C267 64 224 107 224 160L224 288C224 341 267 384 320 384C373 384 416 341 416 288L416 160C416 107 373 64 320 64zM176 248C176 234.7 165.3 224 152 224C138.7 224 128 234.7 128 248L128 288C128 385.9 201.3 466.7 296 478.5L296 528L248 528C234.7 528 224 538.7 224 552C224 565.3 234.7 576 248 576L392 576C405.3 576 416 565.3 416 552C416 538.7 405.3 528 392 528L344 528L344 478.5C438.7 466.7 512 385.9 512 288L512 248C512 234.7 501.3 224 488 224C474.7 224 464 234.7 464 248L464 288C464 367.5 399.5 432 320 432C240.5 432 176 367.5 176 288L176 248z" />
                </svg>
                <span
                    className="dock-label"
                    style={{ fontSize: "clamp(0.625rem, 2vw, 0.75rem)" }}
                >
                    Items
                </span>
            </Link>

            <Link
                href="/notifications"
                className={`transition-transform ${
                    pathname === "/notifications"
                        ? "text-primary scale-110"
                        : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M320 64C306.7 64 296 74.7 296 88L296 97.7C214.6 109.3 152 179.4 152 264L152 278.5C152 316.2 142 353.2 123 385.8L101.1 423.2C97.8 429 96 435.5 96 442.2C96 463.1 112.9 480 133.8 480L506.2 480C527.1 480 544 463.1 544 442.2C544 435.5 542.2 428.9 538.9 423.2L517 385.7C498 353.1 488 316.1 488 278.4L488 263.9C488 179.3 425.4 109.2 344 97.6L344 87.9C344 74.6 333.3 63.9 320 63.9zM488.4 432L151.5 432L164.4 409.9C187.7 370 200 324.6 200 278.5L200 264C200 197.7 253.7 144 320 144C386.3 144 440 197.7 440 264L440 278.5C440 324.7 452.3 370 475.5 409.9L488.4 432zM252.1 528C262 556 288.7 576 320 576C351.3 576 378 556 387.9 528L252.1 528z" />
                </svg>
                <span
                    className="dock-label"
                    style={{ fontSize: "clamp(0.625rem, 2vw, 0.75rem)" }}
                >
                    News
                </span>
            </Link>

            <Link
                href="/documents"
                className={`transition-transform ${
                    pathname === "/documents" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 384 512"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z" />
                </svg>
                <span
                    className="dock-label"
                    style={{ fontSize: "clamp(0.625rem, 2vw, 0.75rem)" }}
                >
                    Docs
                </span>
            </Link>

            <Link
                href="/more"
                className={`transition-transform ${
                    pathname === "/more" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M8 256a56 56 0 1 1 112 0A56 56 0 1 1 8 256zm160 0a56 56 0 1 1 112 0 56 56 0 1 1 -112 0zm216-56a56 56 0 1 1 0 112 56 56 0 1 1 0-112z" />
                </svg>
                <span
                    className="dock-label"
                    style={{ fontSize: "clamp(0.625rem, 2vw, 0.75rem)" }}
                >
                    More
                </span>
            </Link>
        </div>
    );
}
