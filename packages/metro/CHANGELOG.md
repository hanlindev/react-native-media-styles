# Changelog

## Unreleased

- Flatten stylesheet resources and keyed content into one host child array to preserve complete server markup and hydration in deep component trees.

## 0.1.1

- Reduce wrapper nesting to mitigate React server stack-overflow content loss when components declare responsive stylesheet companions.
- Keep child state as stylesheet resources and sibling counts change.
- Preserve React Native Web locale providers and host props while attaching stylesheet resources.
