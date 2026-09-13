-- CreateEnum
CREATE TYPE "ChoreFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "inviteCode" VARCHAR(6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("familyId", "userId")
);

-- CreateTable
CREATE TABLE "Chore" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timeOfDay" "TimeOfDay"[] NOT NULL DEFAULT ARRAY[]::"TimeOfDay"[],
    "completedOn" DATE,
    "frequency" "ChoreFrequency" NOT NULL DEFAULT 'DAILY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Family_inviteCode_key" ON "Family"("inviteCode");

-- CreateIndex
CREATE INDEX "FamilyMember_userId_idx" ON "FamilyMember"("userId");

-- CreateIndex
CREATE INDEX "Chore_familyId_idx" ON "Chore"("familyId");

-- Preserve existing users and parent-child links by creating a family for
-- every existing user, then placing linked children in their parent's family.
DO $function$
DECLARE
    existing_user RECORD;
    family_id TEXT;
    invite_code TEXT;
BEGIN
    FOR existing_user IN SELECT "id" FROM "User" LOOP
        LOOP
            family_id := gen_random_uuid()::text;
            invite_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

            BEGIN
                INSERT INTO "Family" ("id", "inviteCode", "updatedAt")
                VALUES (family_id, invite_code, CURRENT_TIMESTAMP);
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- Retry if the generated invite code collides.
            END;
        END LOOP;

        INSERT INTO "FamilyMember" ("familyId", "userId")
        VALUES (family_id, existing_user."id");
    END LOOP;

    INSERT INTO "FamilyMember" ("familyId", "userId")
    SELECT parent_membership."familyId", parent_child."childId"
    FROM "ParentChild" parent_child
    JOIN "FamilyMember" parent_membership
      ON parent_membership."userId" = parent_child."parentId"
    ON CONFLICT ("familyId", "userId") DO NOTHING;

    DELETE FROM "FamilyMember" child_membership
    USING "User" child_user
    WHERE child_membership."userId" = child_user."id"
      AND child_user."userType" = 'CHILD'::"UserType"
      AND EXISTS (
          SELECT 1
          FROM "ParentChild"
          WHERE "ParentChild"."childId" = child_user."id"
      );

    DELETE FROM "Family" family
    WHERE NOT EXISTS (
        SELECT 1
        FROM "FamilyMember"
        WHERE "FamilyMember"."familyId" = family."id"
    );
END;
$function$;

-- Remove the old direct parent-child relationship and its validation triggers.
DROP TRIGGER IF EXISTS "ParentChild_validate_types" ON "ParentChild";
DROP TRIGGER IF EXISTS "User_validate_type_change" ON "User";
DROP TRIGGER IF EXISTS "User_child_requires_parent" ON "User";
DROP TRIGGER IF EXISTS "ParentChild_child_requires_parent" ON "ParentChild";
DROP FUNCTION IF EXISTS "validate_parent_child_link"();
DROP FUNCTION IF EXISTS "validate_user_type_change"();
DROP FUNCTION IF EXISTS "ensure_child_has_parent"();
DROP TABLE "ParentChild";

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
