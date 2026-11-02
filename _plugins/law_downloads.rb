# Export complete source files, including front matter, rather than rendered document bodies.
# The versions generator runs first and checks filename uniqueness to prevent download collisions.
module LawDownloads
  class MarkdownFile < Jekyll::StaticFile
    # Keep Jekyll's file-copy behaviour while exposing both collections under one download directory.
    def destination(destination_root)
      File.join(destination_root, "downloads", "laws", @name)
    end
  end

  class Generator < Jekyll::Generator
    safe true

    def generate(site)
      collections = [site.collections["laws"], site.collections["versions"]].compact

      collections.flat_map(&:docs).each do |document|
        filename = File.basename(document.path)
        directory = File.dirname(document.relative_path)
        site.static_files << MarkdownFile.new(site, site.source, directory, filename)
        document.data["markdown_url"] = "/downloads/laws/" + filename
      end
    end
  end
end
