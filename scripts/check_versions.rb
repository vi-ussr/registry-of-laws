require "jekyll"
require "tmpdir"
require "fileutils"
require "yaml"

# Exercise the real generators with temporary fixtures, never the published test laws.
project = File.expand_path("..", __dir__)
checks = 0

def assert(condition, message)
  raise message unless condition
end

def write_document(source, directory, filename, data, text)
  File.write(File.join(source, directory, filename), data.to_yaml + "---\n\n" + text)
end

Dir.mktmpdir("register-version-checks") do |temporary|
  source = File.join(temporary, "source")
  FileUtils.mkdir_p(source)
  FileUtils.cp_r(File.join(project, "_plugins"), source)
  ["_laws", "_versions", "_layouts"].each { |name| FileUtils.mkdir_p(File.join(source, name)) }
  File.write(File.join(source, "_layouts", "law.html"), "{{ page.title }}\n{{ content }}")
  
  FileUtils.cp(File.join(project, "_layouts", "law-download.html"), File.join(source, "_layouts"))
  FileUtils.mkdir_p(File.join(source, "_includes"))
  FileUtils.cp(File.join(project, "_includes", "law-download.css"), File.join(source, "_includes"))
  FileUtils.cp(File.join(project, "_includes", "institution.html"), File.join(source, "_includes"))

  original = {"document_id" => "fixture", "title" => "Original fixture", "number" => "T1",
              "effective" => "2026-01-10", "repealed" => "2026-03-01", "attachments" => []}
  revised = {"revision_of" => "fixture", "effective" => "2026-02-01", "attachments" => []}
  reset = lambda do
    write_document(source, "_laws", "fixture.md", original, "Original wording.")
    write_document(source, "_versions", "revision.md", revised, "Revised wording.")
  end
  build = lambda do |date|
    config = Jekyll.configuration({"source" => source, "destination" => File.join(temporary, "output"),
      "quiet" => true, "register_date" => date,
      "collections" => {"laws" => {"output" => true, "permalink" => "/laws/:name/"}, "versions" => {"output" => true}}})
    site = Jekyll::Site.new(config)
    site.process
    site
  end

  # Each boundary is checked independently of the configured date in the actual register.
  [ ["2026-01-09", "Not yet effective", "2026-01-10", "Not yet effective"],
    ["2026-01-10", "In force", "2026-01-10", "Current"],
    ["2026-01-31", "In force", "2026-01-10", "Current"],
    ["2026-02-01", "In force", "2026-02-01", "Current"],
    ["2026-02-28", "In force", "2026-02-01", "Current"],
    ["2026-03-01", "Repealed", "2026-02-01", "Historical"] ].each do |date, status, effective, text_status|
    reset.call
    site = build.call(date)
    law = site.collections.fetch("laws").docs.first
    assert(law.data["legal_status"] == status, "#{date}: incorrect legal status")
    assert(law.data["display_effective"] == effective, "#{date}: incorrect selected version")
    assert(law.data["version_status"] == text_status, "#{date}: incorrect text status")
    expected = effective == "2026-02-01" ? "Revised wording." : "Original wording."
    assert(law.data["display_text"].include?(expected), "#{date}: incorrect displayed wording")
    archive = File.read(File.join(temporary, "output/laws/fixture/versions/2026-01-10/index.html"))
    assert(archive.include?("Original wording.") && !archive.include?("Revised wording."), "Original archive was replaced")
    checks += 1
  end

  # A rejection must be the expected metadata error, not an unrelated build failure.
  rejects = lambda do |label, expected, law_data, revision_data|
    write_document(source, "_laws", "fixture.md", law_data, "Original wording.")
    write_document(source, "_versions", "revision.md", revision_data, "Revised wording.")
    begin
      build.call("2026-02-01")
    rescue Jekyll::Errors::FatalException => error
      assert(error.message.include?(expected), "#{label}: unexpected error: #{error.message}")
      checks += 1
      next
    end
    raise "#{label}: invalid metadata was accepted"
  end
  rejects.call("Impossible date", "invalid date", original.merge("effective" => "2026-02-30"), revised)
  rejects.call("Unquoted date", "quoted YYYY-MM-DD", original.merge("effective" => Date.new(2026, 1, 10)), revised)
  rejects.call("Duplicate effective date", "distinct effective dates", original, revised.merge("effective" => "2026-01-10"))
  rejects.call("Missing original", "missing original law", original, revised.merge("revision_of" => "missing"))
  rejects.call("Repeal on revision date", "Repeal must follow", original.merge("repealed" => "2026-02-01"), revised)
  rejects.call("Unknown related law", "missing or self ID", original.merge("related" => ["missing"]), revised)
  rejects.call("Self reference", "missing or self ID", original.merge("amends" => ["fixture"]), revised)
  rejects.call("Duplicate relationship", "distinct document IDs", original.merge("related" => ["other", "other"]), revised)
end

puts "Version checks passed: #{checks} effective-date, repeal-date, archive and metadata-rejection scenarios."
