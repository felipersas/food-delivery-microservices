/**
 * Scalar UI configuration for modern OpenAPI documentation
 * @see https://scalar.com/
 */
export const scalarHtml = (specUrl: string, title: string) => `
<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <script id="api-reference" data-url="${specUrl}"></script>
    <script>
      var configuration = {
        theme: 'purple',
        layout: 'modern',
        darkMode: true,
        metaData: {
          title: '${title}',
        }
      }
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference';
      script.type = 'application/javascript';
      script.onload = function() {
        Scalar.ApiReference.initialize('#api-reference', configuration);
      };
      document.body.appendChild(script);
    </script>
  </body>
</html>
`;
