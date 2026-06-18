const modalScrollLockProperties = [
    "--page-has-backdrop",
    "--page-overflow",
    "--page-scroll-bg",
    "--page-scroll-gutter",
    "--page-scroll-transition",
];

const scheduleAfterPaint = (callback: () => void, delay = 0) => {
    window.requestAnimationFrame(() => {
        window.setTimeout(callback, delay);
    });
};

const hasOpenModal = () =>
    Boolean(document.querySelector("dialog[open], .modal.modal-open"));

export const prepareModalScrollLock = () => {
    if (typeof document === "undefined") return;

    modalScrollLockProperties.forEach((property) => {
        document.documentElement.style.removeProperty(property);
    });
};

export const cleanupStaleModalScrollLock = () => {
    if (typeof document === "undefined") return;

    const cleanup = () => {
        if (hasOpenModal()) return;

        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
        document.documentElement.style.removeProperty("overflow");
        document.body.style.removeProperty("overflow");
        document.documentElement.style.removeProperty("padding-right");
        document.body.style.removeProperty("padding-right");

        document.documentElement.style.setProperty("--page-has-backdrop", "0");
        document.documentElement.style.setProperty("--page-overflow", "visible");
        document.documentElement.style.setProperty(
            "--page-scroll-bg",
            "var(--root-bg, var(--color-base-100))"
        );
        document.documentElement.style.setProperty(
            "--page-scroll-gutter",
            "auto"
        );
        document.documentElement.style.setProperty(
            "--page-scroll-transition",
            "none"
        );
    };

    cleanup();
    scheduleAfterPaint(cleanup);
    scheduleAfterPaint(cleanup, 80);
    scheduleAfterPaint(cleanup, 300);
};
