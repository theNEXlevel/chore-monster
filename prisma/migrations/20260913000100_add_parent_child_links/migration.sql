-- CreateTable
CREATE TABLE "ParentChild" (
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentChild_pkey" PRIMARY KEY ("parentId", "childId")
);

-- CreateIndex
CREATE INDEX "ParentChild_childId_idx" ON "ParentChild"("childId");

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure every link connects a parent user to a child user.
CREATE OR REPLACE FUNCTION "validate_parent_child_link"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "User"
        WHERE "id" = NEW."parentId"
          AND "userType" = 'PARENT'::"UserType"
    ) THEN
        RAISE EXCEPTION 'ParentChild parentId % must reference a PARENT user', NEW."parentId";
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM "User"
        WHERE "id" = NEW."childId"
          AND "userType" = 'CHILD'::"UserType"
    ) THEN
        RAISE EXCEPTION 'ParentChild childId % must reference a CHILD user', NEW."childId";
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER "ParentChild_validate_types"
BEFORE INSERT OR UPDATE OF "parentId", "childId" ON "ParentChild"
FOR EACH ROW
EXECUTE FUNCTION "validate_parent_child_link"();

-- Prevent changing a linked user's type and invalidating an existing relationship.
CREATE OR REPLACE FUNCTION "validate_user_type_change"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW."userType" = 'PARENT'::"UserType" AND EXISTS (
        SELECT 1
        FROM "ParentChild"
        WHERE "childId" = NEW."id"
    ) THEN
        RAISE EXCEPTION 'User % cannot become a PARENT while linked as a child', NEW."id";
    END IF;

    IF NEW."userType" = 'CHILD'::"UserType" AND EXISTS (
        SELECT 1
        FROM "ParentChild"
        WHERE "parentId" = NEW."id"
    ) THEN
        RAISE EXCEPTION 'User % cannot become a CHILD while linked as a parent', NEW."id";
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER "User_validate_type_change"
BEFORE UPDATE OF "userType" ON "User"
FOR EACH ROW
WHEN (OLD."userType" IS DISTINCT FROM NEW."userType")
EXECUTE FUNCTION "validate_user_type_change"();

-- Enforce the minimum one-parent relationship for child users at transaction commit.
CREATE OR REPLACE FUNCTION "ensure_child_has_parent"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    child_id TEXT;
BEGIN
    IF TG_TABLE_NAME = 'User' THEN
        child_id := NEW."id";
    ELSE
        child_id := OLD."childId";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "User"
        WHERE "id" = child_id
          AND "userType" = 'CHILD'::"UserType"
    ) AND NOT EXISTS (
        SELECT 1
        FROM "ParentChild"
        WHERE "childId" = child_id
    ) THEN
        RAISE EXCEPTION 'Child user % must be linked to at least one parent', child_id;
    END IF;

    RETURN NULL;
END;
$function$;

CREATE CONSTRAINT TRIGGER "User_child_requires_parent"
AFTER INSERT OR UPDATE OF "userType" ON "User"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "ensure_child_has_parent"();

CREATE CONSTRAINT TRIGGER "ParentChild_child_requires_parent"
AFTER DELETE ON "ParentChild"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "ensure_child_has_parent"();
