# Node.js

### Installation

Install `@circleco/headless-server-sdk` to start working with the Authentication SDK.

```bash
npm install @circleco/headless-server-sdk
```



### Import the module into your code

Once the SDK package is installed, import `createClient` from the headless package.

```javascript
import { createClient } from "@circleco/headless-server-sdk";
```



### Create a client

Use the `createClient` function to create a new SDK client instance.

```javascript
const client = createClient({
  appToken: "AppToken", <-- your app token goes here.
});
```



### Send your first request

```typescript
const response = await client.getMemberAPITokenFromSSOId(SSOID);
```

# Node.js

### Installation

Install `@circleco/headless-server-sdk` to start working with the Authentication SDK.

```bash
npm install @circleco/headless-server-sdk
```



### Import the module into your code

Once the SDK package is installed, import `createClient` from the headless package.

```javascript
import { createClient } from "@circleco/headless-server-sdk";
```



### Create a client

Use the `createClient` function to create a new SDK client instance.

```javascript
const client = createClient({
  appToken: "AppToken", <-- your app token goes here.
});
```



### Send your first request

```typescript
const response = await client.getMemberAPITokenFromSSOId(SSOID);
```
