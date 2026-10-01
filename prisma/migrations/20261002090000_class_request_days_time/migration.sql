-- Class request: preferred weekdays + time (Oct 2, 2026). Additive only.
ALTER TABLE "ClassRequest" ADD COLUMN "preferredDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "preferredTime" TEXT;
