import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileAvatar } from "./ProfileAvatar";

describe("ProfileAvatar", () => {
    it("渡されたプロフィール画像を初回描画から使用する", () => {
        render(
            <ProfileAvatar
                name="テスト部員"
                imageUrl="data:image/png;base64,test"
            />
        );

        expect(screen.getByRole("img", { name: "テスト部員" })).toHaveAttribute(
            "src",
            "data:image/png;base64,test"
        );
    });

    it("画像がなければ代替アイコンを表示する", () => {
        const { container } = render(<ProfileAvatar name="テスト部員" />);

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(container.querySelector("svg")).toBeInTheDocument();
    });
});
