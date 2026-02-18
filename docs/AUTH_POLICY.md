# 인증(Authentication) 및 인가(Authorization) 정책 문서

## 1. OAuth2 로그인 정책
현재 본 프로젝트는 **Google OAuth2**를 이용한 소셜 로그인을 제공합니다.

### 1.1 로그인 프로세스
1.  **로그인 요청**: 클라이언트가 `/api/auth/google` 엔드포인트로 접근합니다.
2.  **Google 인증**: 사용자는 Google 로그인 페이지로 리다이렉트되어 인증을 진행합니다.
    -   요청 권한(Scope): `email`, `profile`
3.  **콜백 처리**: 인증 성공 시 Google은 `/api/auth/google/callback`으로 리다이렉트합니다.
4.  **회원 가입/로그인 처리**:
    -   이메일을 기준으로 기존 기부자(User)를 찾습니다.
    -   존재하지 않을 경우, 자동으로 회원을 생성합니다 (`loginPlatform: 'google'`).
5.  **토큰 발급 및 전달**:
    -   **Access Token**: URL 파라미터를 통해 클라이언트에게 전달 (예: `/login/success/<token>`).
    -   **Refresh Token**: **HttpOnly Cookie**로 설정되어 전달됩니다 (보안 강화).
6.  **최종 응답**: 클라이언트로 리다이렉트됩니다.

---

## 2. API 이용 방법 (Authorization)
본 프로젝트는 **JWT (Json Web Token)** 기반의 인증을 사용하며, 전역 가드(`JwtAuthGuard`)가 적용되어 있습니다.

### 2.1 인증 헤더 설정
보호된 API 엔드포인트를 호출할 때는 반드시 **Authorization 헤더**에 암호화된 `Access Token`을 포함해야 합니다.

-   **Header Key**: `Authorization`
-   **Header Value**: `Bearer <Encrypted_Access_Token>`

**예시**:
```http
GET /api/users/profile HTTP/1.1
Host: localhost:3000
Authorization: Bearer U2FsdGVkX19... (암호화된 액세스 토큰)
```

### 2.2 접근 제어
-   **기본 정책**: 모든 API 엔드포인트는 인증이 필요합니다 (`Bearer Token` 필수).
-   **예외 처리**: `@Public()` 데코레이터가 붙은 엔드포인트는 인증 없이 접근 가능합니다 (예: 로그인 페이지, 공통 코드 조회, 토큰 갱신 등).

---

## 3. JWT 토큰 만료 및 갱신 (Refresh) 정책

### 3.1 만료 시간 (Expiration Time)
-   **Access Token**: **60분 (1시간)** (`expiresIn: '60m'`)
-   **Refresh Token**: **7일** (`expiresIn: '7d'`)

### 3.2 토큰 갱신 (Token Refresh) 프로세스
Access Token이 만료되었을 경우, 브라우저에 저장된 **HttpOnly Cookie (refresh_token)** 를 사용하여 재발급받습니다.

1.  **엔드포인트**: `POST /api/auth/refresh`
2.  **요청 (Request)**:
    -   본문(Body)은 비워도 됩니다 (쿠키가 자동으로 전송됨).
    -   단, 쿠키 사용이 불가능한 환경을 대비해 Body의 `refresh_token` 필드도 지원합니다.
3.  **처리 로직**:
    -   요청의 Cookie 또는 Body에서 토큰을 복호화 및 검증합니다.
    -   저장소에 저장된 사용자의 Refresh Token과 일치하는지 확인합니다.
    -   유효하다면, **새로운 Access Token과 새로운 Refresh Token을 발급**합니다 (Token Rotation).
    -   새로운 Refresh Token은 다시 HttpOnly Cookie로 설정됩니다.
4.  **응답**:
    ```json
    {
      "access_token": "<New_Encrypted_Access_Token>",
      "refresh_token": "<New_Encrypted_Refresh_Token>"
    }
    ```

---

## 4. 클라이언트 예외 처리 가이드 (Client Side Error Handling)

클라이언트는 API 요청 시 발생하는 HTTP 상태 코드(Status Code)에 따라 다음과 같이 처리해야 합니다.

### 4.1 Access Token 만료 시 (401 Unauthorized)
-   **상황**: API 요청 시 `401` 에러가 발생하면, Access Token이 만료되었거나 유효하지 않음을 의미합니다.
-   **조치**: `Access Token` 재발급을 시도합니다.
    1.  `POST /api/auth/refresh` 엔드포인트를 호출합니다 (쿠키 자동 전송).
    2.  재발급 성공 시:
        -   새로 받은 `Access Token`으로 헤더를 갱신합니다.
        -   실패했던 원래의 API 요청을 다시 시도합니다 (Retry).

### 4.2 Refresh Token 만료 및 갱신 실패 시 (403 Forbidden)
-   **상황**:
    -   위의 **401** 처리 과정 중, `POST /api/auth/refresh` 호출 자체가 `403` 에러를 반환하는 경우.
    -   Refresh Token이 만료되었거나(7일 경과), 서버에서 폐기된 경우입니다.
-   **조치**: **완전 로그아웃 (Force Logout)** 처리를 수행합니다.
    1.  클라이언트에 저장된 `Access Token`을 삭제합니다.
    2.  사용자를 **로그인 페이지**로 이동시킵니다.
    3.  사용자에게 "세션이 만료되었습니다. 다시 로그인해주세요."와 같은 메시지를 표시합니다.
