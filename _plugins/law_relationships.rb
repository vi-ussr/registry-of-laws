# Resolve editorial references before the version generator copies document metadata.
module LawRelationships
  class Generator < Jekyll::Generator
    safe true
    priority :highest

    def generate(site)
      laws = site.collections.fetch("laws").docs
      by_id = {}
      laws.each do |law|
        id = law.data["document_id"]
        if !id.is_a?(String) || id.empty? || by_id.key?(id)
          raise Jekyll::Errors::FatalException, "Relationships need unique document_id values"
        end
        by_id[id] = law
      end

      labels = {"amends" => "Amends", "repeals" => "Repeals", "related" => "Related documents",
                "amended_by" => "Amended by", "repealed_by" => "Repealed by", "referenced_by" => "Referenced by"}
      reverse = {"amends" => "amended_by", "repeals" => "repealed_by", "related" => "referenced_by"}
      links = {}
      laws.each { |law| links[law.data["document_id"]] = {} }

      # Relationships describe the instrument as a whole, including on archived text pages.
      site.collections.fetch("versions").docs.each do |revision|
        if reverse.keys.any? { |key| revision.data.key?(key) }
          raise Jekyll::Errors::FatalException, "#{revision.relative_path}: put relationships in the original law"
        end
      end

      laws.each do |law|
        source_id = law.data["document_id"]
        reverse.each do |key, reverse_key|
          next unless law.data.key?(key)
          targets = law.data[key]
          unless targets.is_a?(Array) && targets.all? { |id| id.is_a?(String) } && targets.uniq.size == targets.size
            raise Jekyll::Errors::FatalException, "#{law.relative_path}: #{key} must be a list of distinct document IDs"
          end
          targets.each do |target_id|
            unless by_id.key?(target_id) && target_id != source_id
              raise Jekyll::Errors::FatalException, "#{law.relative_path}: #{key} references missing or self ID #{target_id.inspect}"
            end
            (links[source_id][key] ||= []) << target_id
            (links[target_id][reverse_key] ||= []) << source_id
          end
        end
      end

      # Store small link records, not Document objects, to avoid circular template data.
      laws.each do |law|
        law.data["relationship_groups"] = labels.filter_map do |key, label|
          targets = links[law.data["document_id"]][key]
          next if targets.nil? || targets.empty?
          items = targets.sort.map do |id|
            target = by_id.fetch(id)
            {"title" => target.data["title"], "number" => target.data["number"], "url" => target.url}
          end
          {"label" => label, "items" => items}
        end
      end
    end
  end
end
