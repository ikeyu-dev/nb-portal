import { DurableObject } from "cloudflare:workers";

export const readMemberProfile = async (db: D1Database, identifier: string) => {
	const row = await db.prepare(
		`SELECT name, nickname, permission FROM members
		WHERE lower(student_number) = lower(?) AND is_active = 1`
	).bind(identifier).first<{ name: string; nickname: string | null; permission: string }>();
	return {
		success: true,
		isMember: Boolean(row),
		name: row?.name || null,
		nickname: row?.nickname || null,
		permission: row?.permission || null,
	};
};

type Snapshot = {
	profile: Awaited<ReturnType<typeof readMemberProfile>>;
	fetchedAt: number;
	lookupId: string;
};

export class MemberProfileRefresh extends DurableObject<Env> {
	private cached?: Snapshot;
	private pending?: Promise<Snapshot>;

	async getProfile(identifier: string) {
		// 同じ部員を必ず同じObjectへ振り分け、誤ったIDでの結果共有も拒否する。
		if (!this.ctx.id.equals(this.env.MEMBER_PROFILE_REFRESH.idFromName(identifier))) {
			throw new Error("Member profile routing mismatch");
		}
		if (this.cached && Date.now() - this.cached.fetchedAt < 5000) {
			return { ...this.cached, source: "cache" as const };
		}
		this.cached = undefined;
		if (this.pending) return { ...await this.pending, source: "inflight" as const };

		const fetchedAt = Date.now();
		this.pending = readMemberProfile(this.env.DB, identifier).then(profile => ({
			profile, fetchedAt, lookupId: crypto.randomUUID(),
		}));
		try {
			const snapshot = await this.pending;
			// 消失してもD1から復元できる短期キャッシュだけをメモリに保持する。
			if (snapshot.profile.isMember) this.cached = snapshot;
			return { ...snapshot, source: "d1" as const };
		} finally {
			this.pending = undefined;
		}
	}
}
