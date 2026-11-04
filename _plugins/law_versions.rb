require "date"

# Build version metadata before layouts render and before the download generator runs.
# Originals remain in _laws; _versions contains complete later texts, not amendment instructions.
module LawVersions
  class Generator < Jekyll::Generator
    safe true
    priority :high

    # Return a Date for validation, but keep the stored ISO strings for sorting and templates.
    # Fail the build instead of publishing ambiguous or impossible effective dates.
    def valid_date(value, label)
      unless value.is_a?(String) && value.match?(/\A\d{4}-\d{2}-\d{2}\z/)
        raise Jekyll::Errors::FatalException, "#{label}: use a quoted YYYY-MM-DD date"
      end
      Date.iso8601(value)
    rescue Date::Error
      raise Jekyll::Errors::FatalException, "#{label}: invalid date"
    end

    def generate(site)
      register_date = site.config["register_date"]
      valid_date(register_date, "register_date")
      laws = site.collections.fetch("laws").docs
      revisions = site.collections.fetch("versions").docs
      ids = laws.map { |law| law.data["document_id"] }
      unless ids.all? { |id| id.is_a?(String) && id.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/) } && ids.uniq.size == ids.size
        raise Jekyll::Errors::FatalException, "Laws need unique, lowercase document_id values"
      end
      # Downloads share a flat directory, so duplicate basenames would overwrite one another.
      filenames = (laws + revisions).map { |document| File.basename(document.path) }
      unless filenames.uniq.size == filenames.size
        raise Jekyll::Errors::FatalException, "Use distinct filenames for original and revised texts"
      end
      revisions.each do |revision|
        unless ids.include?(revision.data["revision_of"])
          raise Jekyll::Errors::FatalException, "Revision points to a missing original law"
        end
      end

      # TODO: Preserve attachment metadata per version and validate supported Drive file links/resource keys.
      laws.each do |law|
        documents = [law] + revisions.select { |revision| revision.data["revision_of"] == law.data["document_id"] }
        documents.each { |document| valid_date(document.data["effective"], document.relative_path) }
        documents.sort_by! { |document| document.data["effective"] }
        if documents.first != law || documents.map { |d| d.data["effective"] }.uniq.size != documents.size
          raise Jekyll::Errors::FatalException, "Revisions must follow the original and have distinct effective dates"
        end
        repeal = law.data["repealed"]
        if law.data.key?("repealed")
          valid_date(repeal, "#{law.relative_path} repealed")
          if repeal <= documents.last.data["effective"]
            raise Jekyll::Errors::FatalException, "Repeal must follow every text version's effective date"
          end
        end
        # Repeal begins on the stated date; archived wording remains accessible.
        repealed = repeal && repeal <= register_date
        legal_status = if repealed
          "Repealed"
        elsif law.data["effective"] > register_date
          "Not yet effective"
        else
          "In force"
        end
        law.data["legal_status"] = legal_status
        # Use the configured register date, not the machine clock, to select the applicable text.
        current = documents.select { |document| document.data["effective"] <= register_date }.last
        # If nothing is effective yet, show the original with a Not yet effective label.
        selected = current || law
        history = documents.map do |document|
          date = document.data["effective"]
          {"effective" => date,
           "url" => "/laws/#{law.data["document_id"]}/versions/#{date}/",
           "note" => document == law ? "Original publication" : document.data.fetch("change_note", "Revised text"),
           "status" => date > register_date ? "Future" : (document == current && !repealed ? "Current" : "Historical")}
        end

        documents.each_with_index do |document, index|
          # Inherit the law identity while preserving each text's effective date and source download.
          fields = law.data.reject { |key, value| ["layout", "permalink"].include?(key) }.merge(
            "layout" => "law", "version_history" => history,
            "effective" => document.data["effective"],
            "display_effective" => document.data["effective"],
            "version_permalink" => history[index]["url"],
            "version_status" => history[index]["status"],
            "markdown_url" => "/downloads/laws/#{File.basename(document.path)}")
          # The original also needs an immutable URL because its main route can show later text.
          if document == law
            snapshot = Jekyll::PageWithoutAFile.new(site, site.source, history[index]["url"].sub(%r{\A/}, ""), "index.html")
            snapshot.content = law.content
            snapshot.data = fields.merge("render_with_liquid" => false)
            site.pages << snapshot
          else
            document.data.merge!(fields)
            document.data["permalink"] = history[index]["url"]
          end
        end

        # These display fields change the current view without overwriting the original source.
        current_index = documents.index(selected)
        law.data["version_history"] = history
        law.data["display_effective"] = selected.data["effective"]
        law.data["version_permalink"] = history[current_index]["url"]
        law.data["version_status"] = repealed ? "Historical" : (current ? "Current" : "Not yet effective")
        law.data["display_text"] = site.find_converter_instance(Jekyll::Converters::Markdown).convert(selected.content)
        law.data["search_text"] = selected.content
        law.data["selected_markdown_url"] = "/downloads/laws/#{File.basename(selected.path)}"
      end
    end
  end
end
