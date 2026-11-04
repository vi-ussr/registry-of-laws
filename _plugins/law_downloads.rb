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

      documents = collections.flat_map(&:docs)
      html_names = documents.map { |document| File.basename(document.path, File.extname(document.path)) + ".html" }
      unless html_names.uniq.size == html_names.size
        raise Jekyll::Errors::FatalException, "HTML downloads need distinct source filename stems"
      end

      documents.each_with_index do |document, index|
        filename = File.basename(document.path)
        directory = File.dirname(document.relative_path)
        site.static_files << MarkdownFile.new(site, site.source, directory, filename)
        document.data["markdown_url"] = "/downloads/laws/" + filename
        document.data["html_url"] = "/downloads/laws/" + html_names[index]
        if document.data["selected_markdown_url"]
          document.data["selected_html_url"] = document.data["selected_markdown_url"].sub(/\.[^.]+\z/, ".html")
        end

        # Render the source version rather than the main page's potentially newer display_text.
        version = document.data.fetch("version_history").find { |item| item["effective"] == document.data["effective"] }
        export = Jekyll::PageWithoutAFile.new(site, site.source, "downloads/laws", html_names[index])
        export.content = site.find_converter_instance(Jekyll::Converters::Markdown).convert(document.content)
        export.data = document.data.merge(
          "layout" => "law-download", "render_with_liquid" => false,
          "permalink" => "/downloads/laws/" + html_names[index],
          "display_text" => nil, "display_effective" => document.data["effective"],
          "export_version_status" => version["status"])
        site.pages << export

        # Archived originals are generated pages, so assign their download link too.
        site.pages.each do |page|
          if page.data["layout"] == "law" && page.data["markdown_url"] == document.data["markdown_url"]
            page.data["html_url"] = document.data["html_url"]
          end
        end
      end
    end
  end
end
