module LawDownloads
  class MarkdownFile < Jekyll::StaticFile
    def destination(destination_root)
      File.join(destination_root, "downloads", "laws", @name)
    end
  end

  class Generator < Jekyll::Generator
    safe true

    def generate(site)
      collection = site.collections["laws"]
      return unless collection

      collection.docs.each do |document|
        filename = File.basename(document.path)
        directory = File.dirname(document.relative_path)
        site.static_files << MarkdownFile.new(site, site.source, directory, filename)
        document.data["markdown_url"] = "/downloads/laws/" + filename
      end
    end
  end
end
