-- Preserve the immutable normalized AI result independently from user-edited drafts.
ALTER TABLE BSDPGANL ADD COLUMN AI_DRAFT_JSON TEXT;