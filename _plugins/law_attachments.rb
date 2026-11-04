require "uri"

# Validate local metadata only. A successful build cannot verify Drive sharing permissions.
module LawAttachments
  def self.normalize(document)
    items = document.data.fetch("attachments", [])
    unless items.is_a?(Array)
      raise Jekyll::Errors::FatalException, "#{document.relative_path}: attachments must be a list"
    end
    items.map do |item|
      begin
        unless item.is_a?(Hash) && item["title"].is_a?(String) && !item["title"].strip.empty? &&
               item["format"].is_a?(String) && !item["format"].strip.empty? && item["url"].is_a?(String)
          raise ArgumentError, "each attachment needs title, format and url strings"
        end
        uri = URI.parse(item["url"])
        unless uri.scheme == "https" && uri.host == "drive.google.com" && !uri.userinfo && (!uri.port || uri.port == 443)
          raise ArgumentError, "use an HTTPS drive.google.com file link"
        end
        query = URI.decode_www_form(uri.query || "")
        if query.map(&:first).uniq.size != query.size
          raise ArgumentError, "duplicate URL parameters are not supported"
        end
        params = query.to_h
        match = uri.path.match(%r{\A/file/d/([A-Za-z0-9_-]+)(?:/(?:view|preview|edit))?/?\z})
        id = match ? match[1] : (["/open", "/uc"].include?(uri.path) ? params["id"] : nil)
        unless id && id.match?(/\A[A-Za-z0-9_-]+\z/)
          raise ArgumentError, "use a file link, not a folder or Google Docs editor link"
        end
        key = params["resourcekey"]
        if key && !key.match?(/\A[A-Za-z0-9_-]+\z/)
          raise ArgumentError, "invalid resourcekey"
        end
        suffix = key ? "?" + URI.encode_www_form("resourcekey" => key) : ""
        download_params = {"export" => "download", "id" => id}
        download_params["resourcekey"] = key if key
        format = item["format"].strip.upcase
        {"title" => item["title"].strip, "format" => format,
         "view_url" => "https://drive.google.com/file/d/#{id}/view#{suffix}",
         "download_url" => "https://drive.google.com/uc?" + URI.encode_www_form(download_params),
         "preview_url" => format == "PDF" ? "https://drive.google.com/file/d/#{id}/preview#{suffix}" : nil}
      rescue URI::InvalidURIError, ArgumentError => error
        raise Jekyll::Errors::FatalException, "#{document.relative_path}: #{error.message}"
      end
    end
  end
end
