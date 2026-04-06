DELETE FROM "event_list_items" a
USING "event_list_items" b
WHERE a.id < b.id
  AND a.list_id = b.list_id
  AND a.event_id = b.event_id;

CREATE UNIQUE INDEX IF NOT EXISTS "event_list_items_list_event_unique"
ON "event_list_items" ("list_id", "event_id");
