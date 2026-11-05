require "cgi"
require "json"
require "uri"
require "yaml"
require "date"

# Run after Jekyll builds. This checks local output without contacting Google Drive.
root = File.expand_path(ARGV[0] || "_site")
baseurl = (ARGV[1] || "").sub(%r{/$}, "")
errors = []
html_files = Dir.glob(File.join(root, "**", "*.html"))
abort "No HTML found in #{root}; build the site first" if html_files.empty?
ids = {}
html_files.each do |file|
  values = File.read(file).scan(/\bid\s*=\s*["']([^"']*)["']/i).flatten.map { |value| CGI.unescapeHTML(value) }
  errors << "#{file}: duplicate element IDs" unless values.uniq.size == values.size
  ids[file] = values
end

html_files.each do |file|
  html = File.read(file)
  # Exported HTML is movable; check fragments but leave authored relative links alone.
  exported = file.start_with?(File.join(root, "downloads", "laws") + File::SEPARATOR)
  relative = file.delete_prefix(root).tr("\\", "/")
  page_url = URI("https://register.invalid#{baseurl}#{relative}")
  html.scan(/\b(?:href|src)\s*=\s*["']([^"']*)["']/i).flatten.each do |raw|
    link = CGI.unescapeHTML(raw)
    next if link.empty? || link.start_with?("//") || link.match?(/\A[a-z][a-z0-9+.-]*:/i)
    next if exported && !link.start_with?("#")
    begin
      url = URI.join(page_url.to_s, link)
      path = URI::DEFAULT_PARSER.unescape(url.path)
      unless baseurl.empty? || path == baseurl || path.start_with?(baseurl + "/")
        errors << "#{relative}: link escapes Pages prefix: #{link}"
        next
      end
      local = path.delete_prefix(baseurl).sub(%r{\A/}, "")
      target = File.expand_path(local, root)
      unless target == root || target.start_with?(root + File::SEPARATOR)
        errors << "#{relative}: link escapes output: #{link}"
        next
      end
      target = File.join(target, "index.html") if File.directory?(target)
      unless File.file?(target)
        errors << "#{relative}: missing target: #{link}"
        next
      end
      if url.fragment && !url.fragment.empty? && ids.key?(target)
        fragment = URI::DEFAULT_PARSER.unescape(url.fragment)
        errors << "#{relative}: missing fragment: #{link}" unless ids[target].include?(fragment)
      end
    rescue URI::Error, ArgumentError => error
      errors << "#{relative}: invalid link #{link.inspect}: #{error.message}"
    end
  end
end

# Compare generated search statuses and selected downloads with the source dates.
def read_metadata(path)
  source = File.read(path)
  header = source.match(/\A---\r?\n(.*?)\r?\n---/m)
  raise "Missing front matter: #{path}" unless header
  YAML.safe_load(header[1], permitted_classes: [Date], aliases: false)
end
config = YAML.safe_load(File.read("_config.yml"), permitted_classes: [Date], aliases: false)
register_date = config.fetch("register_date")
index = JSON.parse(File.read(File.join(root, "search.json")))
records = index.to_h { |item| [item.fetch("id"), item] }
errors << "Search index contains duplicate IDs" if records.size != index.size
revisions = Dir.glob("_versions/*.{md,markdown}").map { |path| [path, read_metadata(path)] }
laws = Dir.glob("_laws/*.{md,markdown}")
errors << "Search index count differs from law count" unless records.size == laws.size
laws.each do |path|
  data = read_metadata(path)
  id = data.fetch("document_id")
  expected = if data["repealed"] && data["repealed"] <= register_date
    "Repealed"
  elsif data.fetch("effective") > register_date
    "Not yet effective"
  else
    "In force"
  end
  record = records[id]
  errors << "#{path}: incorrect search status" unless record && record["status"] == expected
  versions = [[path, data]] + revisions.select { |_, revision| revision["revision_of"] == id }
  available = versions.select { |_, version| version["effective"] <= register_date }
  selected_path, = available.max_by { |_, version| version["effective"] } || [path, data]
  main = File.join(root, "laws", File.basename(path, File.extname(path)), "index.html")
  selected_stem = File.basename(selected_path, File.extname(selected_path))
  if File.file?(main)
    expected_link = "#{baseurl}/downloads/laws/#{selected_stem}.html"
    errors << "#{path}: HTML download does not follow displayed version" unless File.read(main).include?(%{href="#{expected_link}" download})
  else
    errors << "#{path}: missing main law page"
  end
  versions.each do |source_path, version|
    stem = File.basename(source_path, File.extname(source_path))
    markdown = File.join(root, "downloads", "laws", File.basename(source_path))
    errors << "#{source_path}: Markdown download differs from source" unless File.file?(markdown) && File.binread(markdown) == File.binread(source_path)
    export = File.join(root, "downloads", "laws", stem + ".html")
    errors << "#{source_path}: missing HTML download" unless File.file?(export)
    archive = File.join(root, "laws", id, "versions", version.fetch("effective"), "index.html")
    errors << "#{source_path}: missing preserved version" unless File.file?(archive)
  end
end

unless errors.empty?
  warn errors.uniq.join("\n")
  abort "Site checks failed (#{errors.uniq.size} problems)"
end
puts "Site checks passed: #{html_files.size} HTML pages, #{laws.size} laws, local links, fragments, statuses and version downloads."
