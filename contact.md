---
layout: information
title: Write us
permalink: /contact/
---

Enquiries and corrections are handled by the Commissariat of Justice, Office of First Deputy Commissar, Section of Legislative Publishing and Administration.

{% if site.data.contact.email != empty and site.data.contact.email %}
[Send an email](mailto:{{ site.data.contact.email | escape }})
{% endif %}
{% if site.data.contact.url != empty and site.data.contact.url %}
[Open the contact page]({{ site.data.contact.url | escape }})
{% endif %}
{% if site.data.contact.email == empty and site.data.contact.url == empty %}
Public contact details have not yet been published.
{% endif %}

## Reporting a correction

Include the document number and title, the text version's effective date, the article or paragraph concerned, and the proposed correction. If possible, include a link to the affected text and the supporting publication.

For an attachment problem, include the file title and the message displayed by Google Drive.

This website does not collect or submit messages through a form.
