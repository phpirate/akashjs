# Error Reference

Every AkashJS error includes a unique code, a description, and a link to this documentation.

## Context Errors (AK001x)

| Code | Message |
|---|---|
| [AK0010](/errors/AK0010) | provide() called outside of component setup |
| [AK0012](/errors/AK0012) | inject() called outside of component setup |
| [AK0013](/errors/AK0013) | No provider found for injected context |

## Lifecycle Errors (AK002x)

| Code | Message |
|---|---|
| [AK0020](/errors/AK0020) | onMount() called outside of component setup |
| [AK0021](/errors/AK0021) | onUnmount() called outside of component setup |
| [AK0022](/errors/AK0022) | onError() called outside of component setup |

## Signal Errors (AK003x)

| Code | Message |
|---|---|
| [AK0030](/errors/AK0030) | Circular dependency detected in computed signal |
| [AK0031](/errors/AK0031) | Signal set() called during computation |

## Component Errors (AK004x)

| Code | Message |
|---|---|
| [AK0040](/errors/AK0040) | Component setup must return a render function |
| [AK0041](/errors/AK0041) | Required prop is missing |

## Router Errors (AK005x)

| Code | Message |
|---|---|
| [AK0050](/errors/AK0050) | useRoute() called outside of router context |
| [AK0051](/errors/AK0051) | No route matched the current URL |
| [AK0052](/errors/AK0052) | Route guard threw an error |

## Form Errors (AK006x)

| Code | Message |
|---|---|
| [AK0060](/errors/AK0060) | Form submitted while invalid |
| [AK0061](/errors/AK0061) | Async validator timed out |

## HTTP Errors (AK007x)

| Code | Message |
|---|---|
| [AK0070](/errors/AK0070) | HTTP request failed |
| [AK0071](/errors/AK0071) | createResource() fetcher threw an error |
