const scheduleAfterPaint = (callback: () => void) => {
    window.requestAnimationFrame(() => {
        window.setTimeout(callback, 0);
    });
};

export const cleanupStaleModalScrollLock = () => {
    if (typeof document === "undefined") return;

    scheduleAfterPaint(() => {
        const hasOpenModal = document.querySelector(
            "dialog[open], .modal.modal-open"
        );
        if (hasOpenModal) return;

        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
        document.documentElement.style.removeProperty("overflow");
        document.body.style.removeProperty("overflow");
        document.documentElement.style.removeProperty("padding-right");
        document.body.style.removeProperty("padding-right");
    });
};
