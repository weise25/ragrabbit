CREATE INDEX "search_index" ON "indexed_content_embeddings" USING gin ((
          setweight(to_tsvector('english', "metadata" ->> 'pageUrl'), 'A') ||
          setweight(to_tsvector('english', "metadata" ->> 'pageTitle'), 'B') ||
          setweight(to_tsvector('english', "metadata" ->> 'pageDescription'), 'C') ||
          setweight(to_tsvector('english', "document"), 'D')
        ));