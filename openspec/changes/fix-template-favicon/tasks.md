# Tasks

## 1. Favicon Integration

- [ ] 1.1 Add `<link rel="icon" type="image/x-icon" href="/static/img/favicon.ico">` to `<head>` in `public/template.html` and verify the element is present in the source
- [ ] 1.2 Add an automated integration test in `test/template.test.js` verifying that `GET /template/1` serves HTML referencing `/static/img/favicon.ico` and that `GET /static/img/favicon.ico` returns HTTP 200 with `image/x-icon`
- [ ] 1.3 Run test suite (`npm test`) and verify all tests pass
