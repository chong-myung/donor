#!/usr/bin/env bash
# spec-generator/scripts/scan-project.sh
# 프로젝트 코드베이스를 스캔하여 SPEC.md 생성에 필요한 정보를 JSON으로 출력
#
# Usage: bash scan-project.sh <project-root> [--max-depth 4] [--max-files 2000]
#
# Output: JSON to stdout with detected project metadata

set -euo pipefail

# ─── Arguments ────────────────────────────────────────────────────────────────
PROJECT_ROOT="${1:?Usage: scan-project.sh <project-root> [--max-depth N] [--max-files N]}"
MAX_DEPTH=10
MAX_FILES=2000

shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-depth) MAX_DEPTH="$2"; shift 2 ;;
    --max-files) MAX_FILES="$2"; shift 2 ;;
    *) shift ;;
  esac
done

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

# ─── Temp files ───────────────────────────────────────────────────────────────
TMPDIR_SCAN=$(mktemp -d)
trap 'rm -rf "$TMPDIR_SCAN"' EXIT

# ─── Utility ──────────────────────────────────────────────────────────────────
json_escape() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read().rstrip()))" 2>/dev/null || echo '""'
}

json_array_from_lines() {
  python3 -c "
import json, sys
lines = [l.strip() for l in sys.stdin if l.strip()]
print(json.dumps(lines))
" 2>/dev/null || echo '[]'
}

# ─── 1. Language Detection ────────────────────────────────────────────────────
detect_languages() {
  local langs='[]'
  local items=()

  # Java
  if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.java" | head -1 | grep -q .; then
    local java_ver=""
    # From pom.xml
    if [[ -f "$PROJECT_ROOT/pom.xml" ]]; then
      java_ver=$(grep -oP '(?<=<java.version>)[^<]+' "$PROJECT_ROOT/pom.xml" 2>/dev/null | head -1)
      [[ -z "$java_ver" ]] && java_ver=$(grep -oP '(?<=<maven.compiler.source>)[^<]+' "$PROJECT_ROOT/pom.xml" 2>/dev/null | head -1)
    fi
    # From build.gradle
    if [[ -z "$java_ver" ]]; then
      for gf in "$PROJECT_ROOT"/build.gradle "$PROJECT_ROOT"/build.gradle.kts; do
        [[ -f "$gf" ]] && java_ver=$(grep -oP "(?:sourceCompatibility|JavaVersion\.VERSION_)\K[^\s'\")]*" "$gf" 2>/dev/null | head -1)
        [[ -n "$java_ver" ]] && break
      done
    fi
    items+=("{\"language\":\"Java\",\"version\":\"${java_ver:-unknown}\"}")
  fi

  # Kotlin
  if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.kt" | head -1 | grep -q .; then
    local kt_ver=""
    for gf in "$PROJECT_ROOT"/build.gradle "$PROJECT_ROOT"/build.gradle.kts; do
      [[ -f "$gf" ]] && kt_ver=$(grep -oP "kotlin_version\s*=\s*['\"]?\K[^'\"\\s]+" "$gf" 2>/dev/null | head -1)
      [[ -n "$kt_ver" ]] && break
    done
    items+=("{\"language\":\"Kotlin\",\"version\":\"${kt_ver:-unknown}\"}")
  fi

  # C#
  if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.cs" | head -1 | grep -q .; then
    local cs_ver=""
    local csproj
    csproj=$(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.csproj" | head -1)
    [[ -n "$csproj" ]] && cs_ver=$(grep -oP '(?<=<TargetFramework>)[^<]+' "$csproj" 2>/dev/null | head -1)
    items+=("{\"language\":\"C#\",\"version\":\"${cs_ver:-unknown}\"}")
  fi

  # Python
  if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.py" | head -1 | grep -q .; then
    local py_ver=""
    [[ -f "$PROJECT_ROOT/.python-version" ]] && py_ver=$(cat "$PROJECT_ROOT/.python-version" 2>/dev/null | head -1)
    [[ -z "$py_ver" && -f "$PROJECT_ROOT/runtime.txt" ]] && py_ver=$(grep -oP 'python-\K.*' "$PROJECT_ROOT/runtime.txt" 2>/dev/null | head -1)
    [[ -z "$py_ver" && -f "$PROJECT_ROOT/pyproject.toml" ]] && py_ver=$(grep -oP 'python\s*=\s*"[><=^~]*\K[0-9.]+' "$PROJECT_ROOT/pyproject.toml" 2>/dev/null | head -1)
    items+=("{\"language\":\"Python\",\"version\":\"${py_ver:-unknown}\"}")
  fi

  # TypeScript
  if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.ts" -not -name "*.d.ts" | head -1 | grep -q .; then
    local ts_ver=""
    [[ -f "$PROJECT_ROOT/package.json" ]] && ts_ver=$(python3 -c "import json;d=json.load(open('$PROJECT_ROOT/package.json'));print(d.get('devDependencies',{}).get('typescript',d.get('dependencies',{}).get('typescript','')))" 2>/dev/null)
    items+=("{\"language\":\"TypeScript\",\"version\":\"${ts_ver:-unknown}\"}")
  fi

  # JavaScript (only if no TypeScript)
  if [[ ${#items[@]} -eq 0 ]] || ! printf '%s\n' "${items[@]}" | grep -q TypeScript; then
    if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.js" -not -path "*/node_modules/*" -not -path "*/dist/*" | head -1 | grep -q .; then
      local node_ver=""
      [[ -f "$PROJECT_ROOT/package.json" ]] && node_ver=$(python3 -c "import json;d=json.load(open('$PROJECT_ROOT/package.json'));print(d.get('engines',{}).get('node',''))" 2>/dev/null)
      items+=("{\"language\":\"JavaScript\",\"version\":\"${node_ver:-unknown}\"}")
    fi
  fi

  # Go
  if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.go" | head -1 | grep -q .; then
    local go_ver=""
    [[ -f "$PROJECT_ROOT/go.mod" ]] && go_ver=$(grep -oP '^go\s+\K[0-9.]+' "$PROJECT_ROOT/go.mod" 2>/dev/null | head -1)
    items+=("{\"language\":\"Go\",\"version\":\"${go_ver:-unknown}\"}")
  fi

  # PHP
  if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.php" | head -1 | grep -q .; then
    local php_ver=""
    [[ -f "$PROJECT_ROOT/composer.json" ]] && php_ver=$(python3 -c "import json;d=json.load(open('$PROJECT_ROOT/composer.json'));print(d.get('require',{}).get('php',''))" 2>/dev/null)
    items+=("{\"language\":\"PHP\",\"version\":\"${php_ver:-unknown}\"}")
  fi

  # Ruby
  if find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.rb" | head -1 | grep -q .; then
    local rb_ver=""
    [[ -f "$PROJECT_ROOT/.ruby-version" ]] && rb_ver=$(cat "$PROJECT_ROOT/.ruby-version" 2>/dev/null | head -1)
    items+=("{\"language\":\"Ruby\",\"version\":\"${rb_ver:-unknown}\"}")
  fi

  # Rust
  if [[ -f "$PROJECT_ROOT/Cargo.toml" ]]; then
    local rust_ver=""
    rust_ver=$(grep -oP 'rust-version\s*=\s*"\K[^"]+' "$PROJECT_ROOT/Cargo.toml" 2>/dev/null | head -1)
    items+=("{\"language\":\"Rust\",\"version\":\"${rust_ver:-unknown}\"}")
  fi

  if [[ ${#items[@]} -gt 0 ]]; then
    echo "[$(IFS=,; echo "${items[*]}")]"
  else
    echo "[]"
  fi
}

# ─── 2. Framework Detection ──────────────────────────────────────────────────
detect_frameworks() {
  local items=()

  # --- Java/Kotlin frameworks ---
  for pomfile in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "pom.xml" 2>/dev/null); do
    grep -q "spring-boot" "$pomfile" 2>/dev/null && {
      local sb_ver
      sb_ver=$(grep -oP '(?<=<spring-boot.version>|<version>)[^<]+' "$pomfile" 2>/dev/null | head -1)
      items+=("{\"framework\":\"Spring Boot\",\"version\":\"${sb_ver:-unknown}\",\"source\":\"pom.xml\"}")
    }
    grep -q "spring-framework\|spring-context\|spring-webmvc" "$pomfile" 2>/dev/null && ! printf '%s' "${items[*]:-}" | grep -q "Spring Boot" && {
      items+=("{\"framework\":\"Spring Framework\",\"version\":\"unknown\",\"source\":\"pom.xml\"}")
    }
  done

  for gf in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "build.gradle" -o -name "build.gradle.kts" \) 2>/dev/null); do
    grep -q "spring-boot\|org.springframework.boot" "$gf" 2>/dev/null && ! printf '%s' "${items[*]:-}" | grep -q "Spring" && {
      items+=("{\"framework\":\"Spring Boot\",\"version\":\"unknown\",\"source\":\"build.gradle\"}")
    }
  done

  # --- C# frameworks ---
  for csproj in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.csproj" 2>/dev/null); do
    grep -q "Microsoft.AspNetCore\|Microsoft.NET.Sdk.Web" "$csproj" 2>/dev/null && {
      items+=("{\"framework\":\"ASP.NET Core\",\"version\":\"unknown\",\"source\":\"csproj\"}")
    }
    grep -q "EntityFramework\|Microsoft.EntityFrameworkCore" "$csproj" 2>/dev/null && {
      items+=("{\"framework\":\"Entity Framework\",\"version\":\"unknown\",\"source\":\"csproj\"}")
    }
  done

  # --- Python frameworks ---
  for reqfile in "$PROJECT_ROOT/requirements.txt" "$PROJECT_ROOT/pyproject.toml" "$PROJECT_ROOT/Pipfile" "$PROJECT_ROOT/setup.py" "$PROJECT_ROOT/setup.cfg"; do
    [[ -f "$reqfile" ]] || continue
    grep -qi "django" "$reqfile" 2>/dev/null && {
      local dj_ver
      dj_ver=$(grep -oiP 'django[=>< ]*\K[0-9.]+' "$reqfile" 2>/dev/null | head -1)
      items+=("{\"framework\":\"Django\",\"version\":\"${dj_ver:-unknown}\",\"source\":\"$(basename "$reqfile")\"}")
    }
    grep -qi "flask" "$reqfile" 2>/dev/null && {
      items+=("{\"framework\":\"Flask\",\"version\":\"unknown\",\"source\":\"$(basename "$reqfile")\"}")
    }
    grep -qi "fastapi" "$reqfile" 2>/dev/null && {
      items+=("{\"framework\":\"FastAPI\",\"version\":\"unknown\",\"source\":\"$(basename "$reqfile")\"}")
    }
  done

  # --- Node.js frameworks ---
  if [[ -f "$PROJECT_ROOT/package.json" ]]; then
    local pkg="$PROJECT_ROOT/package.json"
    python3 -c "
import json, sys
d = json.load(open('$pkg'))
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
frameworks = {
  'express': 'Express.js',
  '@nestjs/core': 'NestJS',
  'next': 'Next.js',
  'nuxt': 'Nuxt.js',
  '@angular/core': 'Angular',
  'react': 'React',
  'vue': 'Vue.js',
  'koa': 'Koa',
  'fastify': 'Fastify',
  'hapi': 'Hapi',
}
for key, name in frameworks.items():
  if key in deps:
    ver = deps[key].lstrip('^~>=<')
    print(json.dumps({'framework': name, 'version': ver, 'source': 'package.json'}))
" 2>/dev/null | while read -r line; do
      items+=("$line")
      echo "$line"
    done > "$TMPDIR_SCAN/node_frameworks.txt"
    while IFS= read -r line; do
      items+=("$line")
    done < "$TMPDIR_SCAN/node_frameworks.txt"
  fi

  # --- Go frameworks ---
  if [[ -f "$PROJECT_ROOT/go.mod" ]]; then
    grep -q "gin-gonic/gin" "$PROJECT_ROOT/go.mod" 2>/dev/null && items+=("{\"framework\":\"Gin\",\"version\":\"unknown\",\"source\":\"go.mod\"}")
    grep -q "labstack/echo" "$PROJECT_ROOT/go.mod" 2>/dev/null && items+=("{\"framework\":\"Echo\",\"version\":\"unknown\",\"source\":\"go.mod\"}")
    grep -q "gofiber/fiber" "$PROJECT_ROOT/go.mod" 2>/dev/null && items+=("{\"framework\":\"Fiber\",\"version\":\"unknown\",\"source\":\"go.mod\"}")
  fi

  # --- PHP frameworks ---
  if [[ -f "$PROJECT_ROOT/composer.json" ]]; then
    python3 -c "
import json
d = json.load(open('$PROJECT_ROOT/composer.json'))
deps = d.get('require', {})
if 'laravel/framework' in deps: print(json.dumps({'framework':'Laravel','version':deps['laravel/framework'],'source':'composer.json'}))
if 'symfony/framework-bundle' in deps: print(json.dumps({'framework':'Symfony','version':deps['symfony/framework-bundle'],'source':'composer.json'}))
" 2>/dev/null | while IFS= read -r line; do
      echo "$line"
    done > "$TMPDIR_SCAN/php_frameworks.txt"
    while IFS= read -r line; do
      items+=("$line")
    done < "$TMPDIR_SCAN/php_frameworks.txt"
  fi

  # --- Ruby frameworks ---
  if [[ -f "$PROJECT_ROOT/Gemfile" ]]; then
    grep -q "rails\|'rails'" "$PROJECT_ROOT/Gemfile" 2>/dev/null && items+=("{\"framework\":\"Ruby on Rails\",\"version\":\"unknown\",\"source\":\"Gemfile\"}")
    grep -q "sinatra" "$PROJECT_ROOT/Gemfile" 2>/dev/null && items+=("{\"framework\":\"Sinatra\",\"version\":\"unknown\",\"source\":\"Gemfile\"}")
  fi

  if [[ ${#items[@]} -gt 0 ]]; then
    echo "[$(IFS=,; echo "${items[*]}")]"
  else
    echo "[]"
  fi
}

# ─── 3. ORM / SQL Detection ──────────────────────────────────────────────────
detect_orm() {
  local items=()

  # Java ORMs
  for pomfile in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "pom.xml" 2>/dev/null); do
    grep -q "mybatis" "$pomfile" 2>/dev/null && items+=("\"MyBatis\"")
    grep -q "hibernate" "$pomfile" 2>/dev/null && items+=("\"Hibernate\"")
    grep -q "spring-data-jpa\|jakarta.persistence\|javax.persistence" "$pomfile" 2>/dev/null && items+=("\"JPA\"")
  done
  for gf in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "build.gradle" -o -name "build.gradle.kts" \) 2>/dev/null); do
    grep -q "mybatis" "$gf" 2>/dev/null && items+=("\"MyBatis\"")
    grep -q "hibernate" "$gf" 2>/dev/null && items+=("\"Hibernate\"")
    grep -q "spring-data-jpa\|jakarta.persistence" "$gf" 2>/dev/null && items+=("\"JPA\"")
  done

  # C# ORMs
  for csproj in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.csproj" 2>/dev/null); do
    grep -q "EntityFramework" "$csproj" 2>/dev/null && items+=("\"Entity Framework\"")
    grep -q "Dapper" "$csproj" 2>/dev/null && items+=("\"Dapper\"")
  done

  # Python ORMs
  for reqfile in "$PROJECT_ROOT/requirements.txt" "$PROJECT_ROOT/pyproject.toml" "$PROJECT_ROOT/Pipfile"; do
    [[ -f "$reqfile" ]] || continue
    grep -qi "sqlalchemy" "$reqfile" 2>/dev/null && items+=("\"SQLAlchemy\"")
    grep -qi "django" "$reqfile" 2>/dev/null && items+=("\"Django ORM\"")
    grep -qi "tortoise" "$reqfile" 2>/dev/null && items+=("\"Tortoise ORM\"")
    grep -qi "peewee" "$reqfile" 2>/dev/null && items+=("\"Peewee\"")
  done

  # Node.js ORMs
  if [[ -f "$PROJECT_ROOT/package.json" ]]; then
    python3 -c "
import json
d = json.load(open('$PROJECT_ROOT/package.json'))
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
orms = {'typeorm':'TypeORM','prisma':'Prisma','@prisma/client':'Prisma','sequelize':'Sequelize','knex':'Knex','drizzle-orm':'Drizzle'}
for k,v in orms.items():
  if k in deps: print(v)
" 2>/dev/null | while read -r orm; do
      echo "\"$orm\""
    done > "$TMPDIR_SCAN/node_orms.txt"
    while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/node_orms.txt"
  fi

  # Go ORMs
  if [[ -f "$PROJECT_ROOT/go.mod" ]]; then
    grep -q "gorm.io" "$PROJECT_ROOT/go.mod" 2>/dev/null && items+=("\"GORM\"")
    grep -q "sqlx" "$PROJECT_ROOT/go.mod" 2>/dev/null && items+=("\"sqlx\"")
    grep -q "ent" "$PROJECT_ROOT/go.mod" 2>/dev/null && items+=("\"Ent\"")
  fi

  # Deduplicate
  if [[ ${#items[@]} -gt 0 ]]; then
    printf '%s\n' "${items[@]}" | sort -u | paste -sd, | sed 's/^/[/;s/$/]/'
  else
    echo "[]"
  fi
}

# ─── 4. Database Detection ───────────────────────────────────────────────────
detect_database() {
  local items=()

  # From JDBC URLs (Java)
  for f in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "application.yml" -o -name "application.yaml" -o -name "application.properties" -o -name "application-*.yml" -o -name "application-*.properties" \) 2>/dev/null); do
    local url
    url=$(grep -oP '(?:url|jdbc-url)\s*[:=]\s*\K.*' "$f" 2>/dev/null | head -1)
    [[ -z "$url" ]] && continue
    echo "$url" | grep -qi "mysql" && items+=("\"MySQL\"")
    echo "$url" | grep -qi "postgresql\|postgres" && items+=("\"PostgreSQL\"")
    echo "$url" | grep -qi "oracle" && items+=("\"Oracle\"")
    echo "$url" | grep -qi "sqlserver\|mssql" && items+=("\"SQL Server\"")
    echo "$url" | grep -qi "h2" && items+=("\"H2\"")
    echo "$url" | grep -qi "mariadb" && items+=("\"MariaDB\"")
  done

  # From .NET connection strings
  for f in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "appsettings*.json" 2>/dev/null); do
    python3 -c "
import json
d = json.load(open('$f'))
cs = d.get('ConnectionStrings', {})
for v in cs.values():
  v = v.lower()
  if 'server=' in v or 'data source=' in v:
    if 'mysql' in v: print('MySQL')
    elif 'npgsql' in v or 'postgres' in v: print('PostgreSQL')
    elif 'sqlserver' in v or 'mssql' in v: print('SQL Server')
    elif 'oracle' in v: print('Oracle')
    elif 'sqlite' in v: print('SQLite')
" 2>/dev/null | while read -r db; do echo "\"$db\""; done > "$TMPDIR_SCAN/dotnet_dbs.txt"
    while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/dotnet_dbs.txt"
  done

  # From Python settings
  for f in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "settings.py" -o -name ".env" -o -name "alembic.ini" 2>/dev/null); do
    grep -qi "mysql" "$f" 2>/dev/null && items+=("\"MySQL\"")
    grep -qi "postgres" "$f" 2>/dev/null && items+=("\"PostgreSQL\"")
    grep -qi "oracle" "$f" 2>/dev/null && items+=("\"Oracle\"")
    grep -qi "sqlite" "$f" 2>/dev/null && items+=("\"SQLite\"")
    grep -qi "mongodb\|mongo" "$f" 2>/dev/null && items+=("\"MongoDB\"")
  done

  # From Node.js
  for f in $(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name ".env" -o -name "ormconfig.json" -o -name "knexfile.js" \) 2>/dev/null); do
    grep -qi "mysql" "$f" 2>/dev/null && items+=("\"MySQL\"")
    grep -qi "postgres" "$f" 2>/dev/null && items+=("\"PostgreSQL\"")
    grep -qi "mongo" "$f" 2>/dev/null && items+=("\"MongoDB\"")
    grep -qi "redis" "$f" 2>/dev/null && items+=("\"Redis\"")
  done

  # From Prisma schema
  if [[ -f "$PROJECT_ROOT/prisma/schema.prisma" ]]; then
    local provider
    provider=$(grep -oP 'provider\s*=\s*"\K[^"]+' "$PROJECT_ROOT/prisma/schema.prisma" 2>/dev/null | head -1)
    [[ -n "$provider" ]] && items+=("\"$provider\"")
  fi

  # From Docker compose
  for f in $(find "$PROJECT_ROOT" -maxdepth 2 \( -name "docker-compose.yml" -o -name "docker-compose.yaml" -o -name "compose.yml" \) 2>/dev/null); do
    grep -qi "mysql" "$f" 2>/dev/null && items+=("\"MySQL\"")
    grep -qi "postgres" "$f" 2>/dev/null && items+=("\"PostgreSQL\"")
    grep -qi "mongo" "$f" 2>/dev/null && items+=("\"MongoDB\"")
    grep -qi "redis" "$f" 2>/dev/null && items+=("\"Redis\"")
    grep -qi "oracle" "$f" 2>/dev/null && items+=("\"Oracle\"")
    grep -qi "mariadb" "$f" 2>/dev/null && items+=("\"MariaDB\"")
  done

  if [[ ${#items[@]} -gt 0 ]]; then
    printf '%s\n' "${items[@]}" | sort -u | paste -sd, | sed 's/^/[/;s/$/]/'
  else
    echo "[]"
  fi
}

# ─── 5. Build Tool Detection ─────────────────────────────────────────────────
detect_build_tool() {
  local items=()
  local multi_module="false"

  # Maven
  if [[ -f "$PROJECT_ROOT/pom.xml" ]]; then
    local mvn_ver
    mvn_ver=$(grep -oP '(?<=<maven.version>)[^<]+' "$PROJECT_ROOT/pom.xml" 2>/dev/null | head -1)
    grep -q "<modules>" "$PROJECT_ROOT/pom.xml" 2>/dev/null && multi_module="true"
    items+=("{\"tool\":\"Maven\",\"version\":\"${mvn_ver:-unknown}\",\"multi_module\":$multi_module}")
  fi

  # Gradle
  if [[ -f "$PROJECT_ROOT/build.gradle" ]] || [[ -f "$PROJECT_ROOT/build.gradle.kts" ]]; then
    local gradle_ver=""
    [[ -f "$PROJECT_ROOT/gradle/wrapper/gradle-wrapper.properties" ]] && \
      gradle_ver=$(grep -oP 'gradle-\K[0-9.]+' "$PROJECT_ROOT/gradle/wrapper/gradle-wrapper.properties" 2>/dev/null | head -1)
    [[ -f "$PROJECT_ROOT/settings.gradle" ]] && grep -q "include" "$PROJECT_ROOT/settings.gradle" 2>/dev/null && multi_module="true"
    [[ -f "$PROJECT_ROOT/settings.gradle.kts" ]] && grep -q "include" "$PROJECT_ROOT/settings.gradle.kts" 2>/dev/null && multi_module="true"
    items+=("{\"tool\":\"Gradle\",\"version\":\"${gradle_ver:-unknown}\",\"multi_module\":$multi_module}")
  fi

  # npm/yarn/pnpm
  [[ -f "$PROJECT_ROOT/package.json" ]] && {
    local pkg_mgr="npm"
    [[ -f "$PROJECT_ROOT/yarn.lock" ]] && pkg_mgr="Yarn"
    [[ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]] && pkg_mgr="pnpm"
    # Monorepo detection
    [[ -f "$PROJECT_ROOT/lerna.json" ]] || [[ -f "$PROJECT_ROOT/pnpm-workspace.yaml" ]] && multi_module="true"
    python3 -c "import json;d=json.load(open('$PROJECT_ROOT/package.json'));print('true' if 'workspaces' in d else 'false')" 2>/dev/null | grep -q "true" && multi_module="true"
    items+=("{\"tool\":\"$pkg_mgr\",\"version\":\"unknown\",\"multi_module\":$multi_module}")
  }

  # .NET
  [[ -n "$(find "$PROJECT_ROOT" -maxdepth 1 -name '*.sln' 2>/dev/null | head -1)" ]] && {
    local sln_count
    sln_count=$(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.csproj" 2>/dev/null | wc -l)
    [[ $sln_count -gt 1 ]] && multi_module="true"
    items+=("{\"tool\":\"dotnet\",\"version\":\"unknown\",\"multi_module\":$multi_module}")
  }

  # Go
  [[ -f "$PROJECT_ROOT/go.mod" ]] && items+=("{\"tool\":\"Go Modules\",\"version\":\"unknown\",\"multi_module\":false}")

  # Poetry / PDM
  [[ -f "$PROJECT_ROOT/pyproject.toml" ]] && {
    if grep -q "\[tool.poetry\]" "$PROJECT_ROOT/pyproject.toml" 2>/dev/null; then
      items+=("{\"tool\":\"Poetry\",\"version\":\"unknown\",\"multi_module\":false}")
    elif grep -q "\[tool.pdm\]" "$PROJECT_ROOT/pyproject.toml" 2>/dev/null; then
      items+=("{\"tool\":\"PDM\",\"version\":\"unknown\",\"multi_module\":false}")
    else
      items+=("{\"tool\":\"pip/setuptools\",\"version\":\"unknown\",\"multi_module\":false}")
    fi
  }

  # Cargo (Rust)
  [[ -f "$PROJECT_ROOT/Cargo.toml" ]] && {
    grep -q "\[workspace\]" "$PROJECT_ROOT/Cargo.toml" 2>/dev/null && multi_module="true"
    items+=("{\"tool\":\"Cargo\",\"version\":\"unknown\",\"multi_module\":$multi_module}")
  }

  if [[ ${#items[@]} -gt 0 ]]; then
    echo "[$(IFS=,; echo "${items[*]}")]"
  else
    echo "[]"
  fi
}

# ─── 6. VCS Detection ────────────────────────────────────────────────────────
detect_vcs() {
  [[ -d "$PROJECT_ROOT/.git" ]] && echo '"Git"' && return
  [[ -d "$PROJECT_ROOT/.svn" ]] && echo '"SVN"' && return
  [[ -d "$PROJECT_ROOT/.hg" ]] && echo '"Mercurial"' && return
  echo '"unknown"'
}

# ─── 7. Directory Structure ──────────────────────────────────────────────────
get_directory_structure() {
  # Use tree if available, otherwise find
  if command -v tree &>/dev/null; then
    tree "$PROJECT_ROOT" -L 3 -d --noreport -I "node_modules|.git|.svn|__pycache__|.idea|.vscode|target|build|dist|bin|obj|.gradle|.next|.nuxt|vendor" 2>/dev/null | head -80 | json_escape
  else
    find "$PROJECT_ROOT" -maxdepth 3 -type d \
      -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/__pycache__/*" \
      -not -path "*/target/*" -not -path "*/build/*" -not -path "*/dist/*" \
      -not -path "*/.idea/*" -not -path "*/.vscode/*" -not -path "*/.gradle/*" \
      -not -path "*/vendor/*" -not -path "*/bin/*" -not -path "*/obj/*" \
      2>/dev/null | sort | head -80 | \
      sed "s|$PROJECT_ROOT|project-root|g" | json_escape
  fi
}

# ─── 8. Entry Points ─────────────────────────────────────────────────────────
detect_entry_points() {
  local items=()

  # Java/Kotlin Controllers
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.java" -o -name "*.kt" \) \
    -not -path "*/test/*" -not -path "*/target/*" 2>/dev/null | \
    xargs grep -l "@RestController\|@Controller\|@RequestMapping" 2>/dev/null | head -30 | \
    while read -r f; do
      local rel="${f#$PROJECT_ROOT/}"
      local cls
      cls=$(basename "$f" | sed 's/\.\(java\|kt\)$//')
      echo "{\"file\":\"$rel\",\"class\":\"$cls\",\"type\":\"controller\"}"
    done > "$TMPDIR_SCAN/entry_java.txt"
  while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/entry_java.txt"

  # C# Controllers
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.cs" \
    -not -path "*/test/*" -not -path "*/bin/*" -not -path "*/obj/*" 2>/dev/null | \
    xargs grep -l "\[ApiController\]\|ControllerBase\|Controller\b" 2>/dev/null | head -30 | \
    while read -r f; do
      local rel="${f#$PROJECT_ROOT/}"
      local cls
      cls=$(basename "$f" .cs)
      echo "{\"file\":\"$rel\",\"class\":\"$cls\",\"type\":\"controller\"}"
    done > "$TMPDIR_SCAN/entry_cs.txt"
  while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/entry_cs.txt"

  # Python views/routes
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.py" \
    -not -path "*/test*/*" -not -path "*/__pycache__/*" 2>/dev/null | \
    xargs grep -l "@app\.route\|@router\.\|class.*ViewSet\|class.*APIView\|def.*view" 2>/dev/null | head -30 | \
    while read -r f; do
      local rel="${f#$PROJECT_ROOT/}"
      echo "{\"file\":\"$rel\",\"class\":\"$(basename "$f" .py)\",\"type\":\"route/view\"}"
    done > "$TMPDIR_SCAN/entry_py.txt"
  while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/entry_py.txt"

  # Node.js routes
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.ts" -o -name "*.js" 2>/dev/null | \
    grep -v "node_modules\|dist\|build\|test" | \
    xargs grep -l "@Controller\|router\.\(get\|post\|put\|delete\)\|app\.\(get\|post\|put\|delete\)" 2>/dev/null | head -30 | \
    while read -r f; do
      local rel="${f#$PROJECT_ROOT/}"
      echo "{\"file\":\"$rel\",\"class\":\"$(basename "$f" | sed 's/\.\(ts\|js\)$//')\",\"type\":\"route/controller\"}"
    done > "$TMPDIR_SCAN/entry_node.txt"
  while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/entry_node.txt"

  # Go handlers
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.go" \
    -not -path "*/vendor/*" -not -name "*_test.go" 2>/dev/null | \
    xargs grep -l "func.*Handler\|\.GET(\|\.POST(\|HandleFunc\|http\.Handle" 2>/dev/null | head -30 | \
    while read -r f; do
      local rel="${f#$PROJECT_ROOT/}"
      echo "{\"file\":\"$rel\",\"class\":\"$(basename "$f" .go)\",\"type\":\"handler\"}"
    done > "$TMPDIR_SCAN/entry_go.txt"
  while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/entry_go.txt"

  if [[ ${#items[@]} -gt 0 ]]; then
    echo "[$(IFS=,; echo "${items[*]}")]"
  else
    echo "[]"
  fi
}

# ─── 9. SQL Mappers / Migration Files ────────────────────────────────────────
detect_sql_files() {
  {
    # MyBatis mappers
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*Mapper.xml" -o -name "*-mapper.xml" -o -name "*Dao.xml" \) 2>/dev/null
    # SQL migration files
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -path "*/migration*/*.sql" -o -path "*/db/migrate/*" -o -path "*/alembic/versions/*.py" 2>/dev/null
    # Prisma schema
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "schema.prisma" 2>/dev/null
    # Flyway / Liquibase
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -path "*/db/migration/*.sql" -o -name "*.changelog*.xml" -o -name "*.changelog*.yml" \) 2>/dev/null
  } | sed "s|$PROJECT_ROOT/||g" | sort | head -50 | json_array_from_lines
}

# ─── 10. ERD / Table References ───────────────────────────────────────────────

# 10-a. ERD 파일 탐지
# 프로젝트 내 ERD 파일(이미지, 텍스트 기반 다이어그램)을 찾아 JSON 배열로 반환
detect_erd_files() {
  local items=()

  # ── Text-based ERD formats ──
  # DBML (dbdiagram.io) - explicit .dbml extension
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.dbml" 2>/dev/null | \
    while read -r f; do echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"dbml\"}"; done > "$TMPDIR_SCAN/erd_dbml.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_dbml.txt"

  # dbdiagram.io format in non-.dbml files (.txt, .sql, .text, or generic text files)
  # dbdiagram uses: Table name {, Ref:, Enum name {, TableGroup name {
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.txt" -o -name "*.text" -o -name "*.sql" -o -name "*.dbd" \) \
    -not -path "*/node_modules/*" -not -path "*/target/*" -not -path "*/dist/*" 2>/dev/null | \
    while read -r f; do
      # Check for dbdiagram-specific syntax: "Table xxx {" combined with column definitions or Ref:
      if grep -qP '^\s*Table\s+\w' "$f" 2>/dev/null && \
         grep -qP 'Ref[:\s]|\[ref:\s*[<>\-]|^\s*(int|integer|varchar|text|bool|timestamp|decimal|float|bigint|uuid|serial|date)\b' "$f" 2>/dev/null; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"dbml\"}"
      fi
    done > "$TMPDIR_SCAN/erd_dbml_other.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_dbml_other.txt"

  # PlantUML with entity-relationship content
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.puml" -o -name "*.plantuml" -o -name "*.pu" \) 2>/dev/null | \
    while read -r f; do
      if grep -qiP 'entity\s|@startuml|erDiagram|table\(' "$f" 2>/dev/null; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"plantuml\"}"
      fi
    done > "$TMPDIR_SCAN/erd_puml.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_puml.txt"

  # Mermaid ER diagrams
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.mermaid" -o -name "*.mmd" \) 2>/dev/null | \
    while read -r f; do
      if grep -qiP 'erDiagram|entity' "$f" 2>/dev/null; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"mermaid\"}"
      fi
    done > "$TMPDIR_SCAN/erd_mermaid.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_mermaid.txt"

  # Markdown files containing ER diagrams (mermaid code blocks, text-based relationships, or dbdiagram syntax)
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.md" 2>/dev/null | \
    while read -r f; do
      local fname_lower
      fname_lower=$(basename "$f" | tr '[:upper:]' '[:lower:]')
      # File name hints: erd, entity, schema, db-diagram, database, relation, dbdiagram
      if echo "$fname_lower" | grep -qiP 'erd|entity|schema|db.?diagram|database|relation|dbdiagram'; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"markdown_erd\"}"
      # Or content contains relationship notation: (1) ── (N), erDiagram, mermaid ER block
      elif grep -qP '\(\d\)\s*[─—-]+\s*\(\d\)|erDiagram|```mermaid' "$f" 2>/dev/null; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"markdown_erd\"}"
      # Or content contains dbdiagram.io syntax (Table xxx { + Ref:)
      elif grep -qP '^\s*Table\s+\w' "$f" 2>/dev/null && \
           grep -qP 'Ref[:\s]|\[ref:\s*[<>\-]' "$f" 2>/dev/null; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"markdown_erd\"}"
      fi
    done > "$TMPDIR_SCAN/erd_md.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_md.txt"

  # Text files with ERD-like names
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.txt" -o -name "*.text" \) 2>/dev/null | \
    while read -r f; do
      local fname_lower
      fname_lower=$(basename "$f" | tr '[:upper:]' '[:lower:]')
      if echo "$fname_lower" | grep -qiP 'erd|entity|schema|relation|table'; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"text_erd\"}"
      fi
    done > "$TMPDIR_SCAN/erd_txt.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_txt.txt"

  # ── DDL (SQL schema definition files) ──
  # .sql files containing CREATE TABLE statements
  # Search in common DDL locations first, then scan broadly
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.sql" \
    -not -path "*/node_modules/*" -not -path "*/target/*" -not -path "*/dist/*" \
    -not -path "*/test/*" -not -path "*/.git/*" 2>/dev/null | \
    while read -r f; do
      # Must contain at least one CREATE TABLE statement
      if grep -qiP '^\s*CREATE\s+(OR\s+REPLACE\s+)?TABLE\b' "$f" 2>/dev/null; then
        local fname_lower
        fname_lower=$(basename "$f" | tr '[:upper:]' '[:lower:]')
        # Prioritize files that look like schema/DDL definitions
        # vs migration files which might only have ALTER TABLE
        local create_count
        create_count=$(grep -ciP '^\s*CREATE\s+(OR\s+REPLACE\s+)?TABLE\b' "$f" 2>/dev/null || echo "0")
        if [[ "$create_count" -ge 1 ]]; then
          echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"ddl\",\"create_table_count\":$create_count}"
        fi
      fi
    done > "$TMPDIR_SCAN/erd_ddl.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_ddl.txt"

  # Draw.io / diagrams.net
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.drawio" -o -name "*.drawio.xml" \) 2>/dev/null | \
    while read -r f; do
      local fname_lower
      fname_lower=$(basename "$f" | tr '[:upper:]' '[:lower:]')
      if echo "$fname_lower" | grep -qiP 'erd|entity|schema|db|table|relation'; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"drawio\"}"
      fi
    done > "$TMPDIR_SCAN/erd_drawio.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_drawio.txt"

  # ── Image-based ERD (filename heuristic only) ──
  find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.svg" -o -name "*.pdf" \) 2>/dev/null | \
    while read -r f; do
      local fname_lower
      fname_lower=$(basename "$f" | tr '[:upper:]' '[:lower:]')
      if echo "$fname_lower" | grep -qiP 'erd|entity.?rel|schema|db.?diagram|table.?rel|database.?design'; then
        echo "{\"file\":\"${f#$PROJECT_ROOT/}\",\"type\":\"image_erd\"}"
      fi
    done > "$TMPDIR_SCAN/erd_img.txt"
  while IFS= read -r line; do [[ -n "$line" ]] && items+=("$line"); done < "$TMPDIR_SCAN/erd_img.txt"

  if [[ ${#items[@]} -gt 0 ]]; then
    echo "[$(IFS=,; echo "${items[*]}")]"
  else
    echo "[]"
  fi
}

# 10-b. ERD 파일에서 테이블 및 관계 파싱
# 텍스트 기반 ERD 파일의 내용을 읽어 테이블명, 컬럼, 관계를 추출
parse_erd_content() {
  # 입력: ERD 파일 경로 목록 (TMPDIR_SCAN/erd_parseable.txt)
  # 출력: JSON { tables: [...], relationships: [...], raw_content: "..." }

  python3 << 'PYEOF'
import json, sys, os, re

project_root = os.environ.get("PROJECT_ROOT", "")
erd_list_file = os.environ.get("ERD_LIST_FILE", "")

if not erd_list_file or not os.path.exists(erd_list_file):
    print(json.dumps({"tables": [], "relationships": [], "raw_content": ""}))
    sys.exit(0)

with open(erd_list_file) as f:
    erd_entries = [json.loads(line.strip()) for line in f if line.strip()]

if not erd_entries:
    print(json.dumps({"tables": [], "relationships": [], "raw_content": ""}))
    sys.exit(0)

tables = set()
relationships = []
raw_parts = []

for entry in erd_entries:
    filepath = os.path.join(project_root, entry["file"])
    erd_type = entry["type"]

    # Skip image-based or drawio (can't parse content meaningfully)
    if erd_type in ("image_erd", "drawio"):
        continue

    if not os.path.exists(filepath):
        continue

    try:
        with open(filepath, encoding="utf-8", errors="replace") as ef:
            content = ef.read()
    except Exception:
        continue

    raw_parts.append(f"--- {entry['file']} ({erd_type}) ---\n{content}")

    # ── DBML parsing ──
    if erd_type == "dbml":
        # Table "name" or Table name {
        for m in re.finditer(r'(?:Table|table)\s+["\']?(\w+)["\']?\s', content):
            tables.add(m.group(1))
        # Ref: table1.col > table2.col
        for m in re.finditer(r'Ref[:\s]+(\w+)\.(\w+)\s*([<>-]+)\s*(\w+)\.(\w+)', content):
            t1, c1, rel_op, t2, c2 = m.groups()
            tables.add(t1)
            tables.add(t2)
            cardinality = "unknown"
            if rel_op == ">":  cardinality = "many-to-one"
            elif rel_op == "<":  cardinality = "one-to-many"
            elif rel_op == "-":  cardinality = "one-to-one"
            elif rel_op == "<>": cardinality = "many-to-many"
            relationships.append({
                "from": t1, "from_col": c1,
                "to": t2, "to_col": c2,
                "cardinality": cardinality
            })

    # ── PlantUML parsing ──
    elif erd_type == "plantuml":
        # entity "NAME" as alias  OR  entity NAME {
        for m in re.finditer(r'entity\s+["\']?(\w+)["\']?', content):
            tables.add(m.group(1))
        # table(NAME) pattern
        for m in re.finditer(r'table\((\w+)\)', content):
            tables.add(m.group(1))
        # Relationships: A ||--o{ B  or  A }|--|{ B  etc.
        for m in re.finditer(r'(\w+)\s+([|}{o]+--[|}{o]+)\s+(\w+)', content):
            t1, rel_notation, t2 = m.groups()
            tables.add(t1)
            tables.add(t2)
            # Parse cardinality from crow's foot notation
            # Left side = from (t1), Right side = to (t2)
            # || = exactly one, o| = zero or one, }| or |{ = one or more, }o or o{ = zero or more
            left = rel_notation.split('--')[0] if '--' in rel_notation else ''
            right = rel_notation.split('--')[1] if '--' in rel_notation else ''
            def side_cardinality(s):
                if '}' in s or '{' in s:  return 'many'
                return 'one'
            left_card = side_cardinality(left)
            right_card = side_cardinality(right)
            cardinality = f"{left_card}-to-{right_card}"
            relationships.append({
                "from": t1, "to": t2,
                "cardinality": cardinality
            })

    # ── Mermaid erDiagram parsing ──
    elif erd_type == "mermaid":
        # Entity names from relationship lines: A ||--o{ B : "label"
        for m in re.finditer(r'(\w+)\s+([|}{o]+--[|}{o]+)\s+(\w+)\s*:', content):
            t1, rel_notation, t2 = m.groups()
            tables.add(t1)
            tables.add(t2)
            left = rel_notation.split('--')[0] if '--' in rel_notation else ''
            right = rel_notation.split('--')[1] if '--' in rel_notation else ''
            def side_card(s):
                if '}' in s or '{' in s: return 'many'
                return 'one'
            cardinality = f"{side_card(left)}-to-{side_card(right)}"
            relationships.append({
                "from": t1, "to": t2,
                "cardinality": cardinality
            })
        # Standalone entity blocks: EntityName {
        for m in re.finditer(r'^\s+(\w+)\s*\{', content, re.MULTILINE):
            tables.add(m.group(1))

    # ── Markdown / Text ERD parsing ──
    elif erd_type in ("markdown_erd", "text_erd"):
        # Mermaid code blocks inside markdown
        mermaid_blocks = re.findall(r'```mermaid\s*(.*?)```', content, re.DOTALL)
        for block in mermaid_blocks:
            for m in re.finditer(r'(\w+)\s+([|}{o]+--[|}{o]+)\s+(\w+)\s*:', block):
                t1, rel_notation, t2 = m.groups()
                tables.add(t1)
                tables.add(t2)
                left = rel_notation.split('--')[0] if '--' in rel_notation else ''
                right = rel_notation.split('--')[1] if '--' in rel_notation else ''
                def md_side_card(s):
                    if '}' in s or '{' in s: return 'many'
                    return 'one'
                cardinality = f"{md_side_card(left)}-to-{md_side_card(right)}"
                relationships.append({
                    "from": t1, "to": t2,
                    "cardinality": cardinality
                })

        # Text-based relationship notation:
        # T_ORDER (1) ──── (N) T_BILLING
        # T_ORDER (1) ---- (N) T_BILLING
        # T_ORDER (1) — (N) T_BILLING
        for m in re.finditer(
            r'(\w+)\s*\(([1NMnm*])\)\s*[─—\-]+\s*\(([1NMnm*])\)\s*(\w+)',
            content
        ):
            t1, card1, card2, t2 = m.groups()
            tables.add(t1)
            tables.add(t2)
            c1 = card1.upper().replace("M", "N").replace("*", "N")
            c2 = card2.upper().replace("M", "N").replace("*", "N")
            if c1 == "1" and c2 == "N":   cardinality = "one-to-many"
            elif c1 == "N" and c2 == "1": cardinality = "many-to-one"
            elif c1 == "N" and c2 == "N": cardinality = "many-to-many"
            else:                          cardinality = "one-to-one"
            relationships.append({
                "from": t1, "to": t2,
                "cardinality": cardinality
            })

        # Also try: TABLE_A → TABLE_B, TABLE_A -> TABLE_B
        for m in re.finditer(r'(\w+)\s*[→\->]+\s*(\w+)', content):
            t1, t2 = m.groups()
            # Only add if looks like a table name:
            # - contains underscore (T_ORDER), or
            # - all uppercase (ORDER), or
            # - 3+ chars and starts with uppercase + has digits (Order123)
            def is_table_like(name):
                return ('_' in name or name.isupper() or
                        (len(name) > 2 and name[0].isupper() and any(c.isdigit() for c in name)))
            if is_table_like(t1) and is_table_like(t2):
                tables.add(t1)
                tables.add(t2)

    # ── DDL (SQL CREATE TABLE) parsing ──
    elif erd_type == "ddl":
        # Normalize: remove SQL comments
        cleaned = re.sub(r'--[^\n]*', '', content)          # single-line comments
        cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)  # block comments

        # ── Extract CREATE TABLE statements ──
        # Matches: CREATE TABLE [IF NOT EXISTS] [schema.]table_name (
        create_pattern = re.compile(
            r'CREATE\s+(?:OR\s+REPLACE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?'
            r'(?:[`"\[\w]+\.)?'           # optional schema prefix: schema. or [schema].
            r'[`"\[]?(\w+)[`"\]]?'        # table name (capture group 1)
            r'\s*\(',                      # opening paren
            re.IGNORECASE
        )

        # For each CREATE TABLE, extract the full body between ( and matching )
        for cm in create_pattern.finditer(cleaned):
            table_name = cm.group(1)
            tables.add(table_name)

            # Find the matching closing paren for column definitions
            start = cm.end() - 1  # position of '('
            depth = 0
            body_end = start
            for i in range(start, len(cleaned)):
                if cleaned[i] == '(':
                    depth += 1
                elif cleaned[i] == ')':
                    depth -= 1
                    if depth == 0:
                        body_end = i
                        break

            body = cleaned[start+1:body_end]

            # ── Extract FOREIGN KEY constraints from body ──
            # Pattern 1: FOREIGN KEY (col) REFERENCES other_table(col)
            fk_pattern = re.compile(
                r'FOREIGN\s+KEY\s*\(\s*[`"\[]?(\w+)[`"\]]?\s*\)\s*'
                r'REFERENCES\s+(?:[`"\[\w]+\.)?[`"\[]?(\w+)[`"\]]?\s*'
                r'\(\s*[`"\[]?(\w+)[`"\]]?\s*\)',
                re.IGNORECASE
            )
            for fk in fk_pattern.finditer(body):
                fk_col, ref_table, ref_col = fk.groups()
                tables.add(ref_table)
                relationships.append({
                    "from": table_name, "from_col": fk_col,
                    "to": ref_table, "to_col": ref_col,
                    "cardinality": "many-to-one"
                })

            # Pattern 2: column_name TYPE REFERENCES other_table(col) (inline FK)
            inline_fk_pattern = re.compile(
                r'[`"\[]?(\w+)[`"\]]?\s+'            # column name
                r'(?:\w+(?:\([^)]*\))?)\s+'           # data type (with optional precision)
                r'(?:(?:NOT\s+)?NULL\s+|DEFAULT\s+[^,]+\s+|'  # optional constraints before REFERENCES
                r'UNIQUE\s+|PRIMARY\s+KEY\s+)*'
                r'REFERENCES\s+(?:[`"\[\w]+\.)?[`"\[]?(\w+)[`"\]]?\s*'
                r'\(\s*[`"\[]?(\w+)[`"\]]?\s*\)',
                re.IGNORECASE
            )
            for ifk in inline_fk_pattern.finditer(body):
                fk_col, ref_table, ref_col = ifk.groups()
                tables.add(ref_table)
                # Avoid duplicate if already caught by FOREIGN KEY pattern
                dup = False
                for r in relationships:
                    if (r.get("from") == table_name and r.get("from_col") == fk_col
                            and r.get("to") == ref_table):
                        dup = True
                        break
                if not dup:
                    relationships.append({
                        "from": table_name, "from_col": fk_col,
                        "to": ref_table, "to_col": ref_col,
                        "cardinality": "many-to-one"
                    })

        # ── Extract ALTER TABLE ... ADD FOREIGN KEY ──
        alter_fk_pattern = re.compile(
            r'ALTER\s+TABLE\s+(?:[`"\[\w]+\.)?[`"\[]?(\w+)[`"\]]?\s+'
            r'ADD\s+(?:CONSTRAINT\s+\w+\s+)?'
            r'FOREIGN\s+KEY\s*\(\s*[`"\[]?(\w+)[`"\]]?\s*\)\s*'
            r'REFERENCES\s+(?:[`"\[\w]+\.)?[`"\[]?(\w+)[`"\]]?\s*'
            r'\(\s*[`"\[]?(\w+)[`"\]]?\s*\)',
            re.IGNORECASE
        )
        for afk in alter_fk_pattern.finditer(cleaned):
            from_table, fk_col, ref_table, ref_col = afk.groups()
            tables.add(from_table)
            tables.add(ref_table)
            relationships.append({
                "from": from_table, "from_col": fk_col,
                "to": ref_table, "to_col": ref_col,
                "cardinality": "many-to-one"
            })

# Trim raw_content to avoid huge output
raw_combined = "\n\n".join(raw_parts)
if len(raw_combined) > 10000:
    raw_combined = raw_combined[:10000] + "\n... (truncated)"

result = {
    "tables": sorted(tables),
    "relationships": relationships,
    "raw_content": raw_combined
}
print(json.dumps(result, ensure_ascii=False))
PYEOF
}

# 10-c. 코드 기반 테이블 탐지 (ERD 없을 때 폴백)
detect_tables_from_code() {
  {
    # From SQL mapper XMLs
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.xml" -path "*mapper*" -o -name "*.xml" -path "*Mapper*" \) 2>/dev/null | \
      xargs grep -ohP '(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+[`"]?\K[A-Z_][A-Z0-9_]+' 2>/dev/null

    # From SQL files
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.sql" 2>/dev/null | head -20 | \
      xargs grep -ohP '(?:FROM|JOIN|INTO|UPDATE|CREATE\s+TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?\K[A-Za-z_][A-Za-z0-9_]+' 2>/dev/null

    # From Java/Kotlin annotations
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.java" -o -name "*.kt" \) -not -path "*/test/*" 2>/dev/null | \
      xargs grep -ohP '@Table\s*\(\s*name\s*=\s*"\K[^"]+' 2>/dev/null

    # From C# Entity Framework
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.cs" -not -path "*/test/*" 2>/dev/null | \
      xargs grep -ohP '\[Table\("\K[^"]+' 2>/dev/null

    # From Python Django models
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "models.py" 2>/dev/null | \
      xargs grep -ohP "db_table\s*=\s*['\"]?\K[A-Za-z_][A-Za-z0-9_]+" 2>/dev/null

    # From Prisma schema
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "schema.prisma" 2>/dev/null | \
      xargs grep -ohP '@@map\("\K[^"]+' 2>/dev/null
    find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "schema.prisma" 2>/dev/null | \
      xargs grep -ohP '^model\s+\K[A-Za-z]+' 2>/dev/null

  } | sort -u | head -80 | json_array_from_lines
}

# 10-d. 통합 테이블 탐지: ERD 우선, 없으면 코드 스캔
detect_tables() {
  local erd_json
  erd_json=$(detect_erd_files)

  # ERD 파일이 없으면 코드 기반 폴백
  if [[ "$erd_json" == "[]" ]]; then
    detect_tables_from_code
    return
  fi

  # ERD 파일이 있으면 파싱 가능한 항목 필터링
  local parseable_erds
  parseable_erds=$(echo "$erd_json" | python3 -c "
import json, sys
entries = json.load(sys.stdin)
parseable = [e for e in entries if e['type'] not in ('image_erd', 'drawio')]
for e in parseable:
    print(json.dumps(e))
" 2>/dev/null)

  # 파싱 가능한 텍스트 ERD가 없으면(이미지만 있으면) 코드 스캔 폴백
  if [[ -z "$parseable_erds" ]]; then
    detect_tables_from_code
    return
  fi

  # ERD 파일에서 테이블/관계 추출
  echo "$parseable_erds" > "$TMPDIR_SCAN/erd_parseable.txt"
  local parsed
  parsed=$(PROJECT_ROOT="$PROJECT_ROOT" ERD_LIST_FILE="$TMPDIR_SCAN/erd_parseable.txt" parse_erd_content)

  # 추출된 테이블 목록 반환
  echo "$parsed" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(json.dumps(d.get('tables', [])))
" 2>/dev/null || detect_tables_from_code
}

# 10-e. ERD 관계 정보 추출 (별도 JSON 필드로 출력)
detect_erd_relationships() {
  local erd_json
  erd_json=$(detect_erd_files)

  if [[ "$erd_json" == "[]" ]]; then
    echo "{\"erd_files\":[],\"relationships\":[],\"raw_content\":\"\"}"
    return
  fi

  local parseable_erds
  parseable_erds=$(echo "$erd_json" | python3 -c "
import json, sys
entries = json.load(sys.stdin)
parseable = [e for e in entries if e['type'] not in ('image_erd', 'drawio')]
for e in parseable:
    print(json.dumps(e))
" 2>/dev/null)

  if [[ -z "$parseable_erds" ]]; then
    # 이미지 ERD만 있는 경우: 파일 경로만 반환
    echo "$erd_json" | python3 -c "
import json, sys
files = json.load(sys.stdin)
print(json.dumps({'erd_files': files, 'relationships': [], 'raw_content': ''}))
" 2>/dev/null
    return
  fi

  echo "$parseable_erds" > "$TMPDIR_SCAN/erd_parseable.txt"
  local parsed
  parsed=$(PROJECT_ROOT="$PROJECT_ROOT" ERD_LIST_FILE="$TMPDIR_SCAN/erd_parseable.txt" parse_erd_content)

  # 파싱 결과를 temp 파일에 저장 후 erd_files와 합침
  echo "$parsed" > "$TMPDIR_SCAN/erd_parsed_result.json"
  echo "$erd_json" > "$TMPDIR_SCAN/erd_files_list.json"

  python3 -c "
import json
with open('$TMPDIR_SCAN/erd_files_list.json') as f:
    erd_files = json.load(f)
with open('$TMPDIR_SCAN/erd_parsed_result.json') as f:
    parsed = json.load(f)
result = {
    'erd_files': erd_files,
    'relationships': parsed.get('relationships', []),
    'raw_content': parsed.get('raw_content', '')
}
print(json.dumps(result, ensure_ascii=False))
" 2>/dev/null || echo "{\"erd_files\":$erd_json,\"relationships\":[],\"raw_content\":\"\"}"
}

# ─── 11. External Integration Hints ──────────────────────────────────────────
detect_integrations() {
  local items=()

  # REST clients
  local rest_hints
  rest_hints=$(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.java" -o -name "*.kt" -o -name "*.cs" -o -name "*.py" -o -name "*.ts" -o -name "*.js" -o -name "*.go" \) \
    -not -path "*/test/*" -not -path "*/node_modules/*" 2>/dev/null | \
    xargs grep -l "RestTemplate\|WebClient\|FeignClient\|HttpClient\|requests\.\|axios\|fetch(\|http\.Client\|HttpClientFactory\|@FeignClient" 2>/dev/null | \
    sed "s|$PROJECT_ROOT/||g" | head -10)
  [[ -n "$rest_hints" ]] && items+=("{\"type\":\"REST_CLIENT\",\"files\":[$(echo "$rest_hints" | while read -r f; do printf '\"%s\",' "$f"; done | sed 's/,$//')]}")

  # SOAP
  local soap_hints
  soap_hints=$(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.wsdl" -o -name "*.xsd" 2>/dev/null | head -5 | sed "s|$PROJECT_ROOT/||g")
  [[ -n "$soap_hints" ]] && items+=("{\"type\":\"SOAP\",\"files\":[$(echo "$soap_hints" | while read -r f; do printf '\"%s\",' "$f"; done | sed 's/,$//')]}")

  # Message Queues
  local mq_hints
  mq_hints=$(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.java" -o -name "*.kt" -o -name "*.cs" -o -name "*.py" -o -name "*.ts" -o -name "*.go" \) \
    -not -path "*/test/*" -not -path "*/node_modules/*" 2>/dev/null | \
    xargs grep -l "KafkaTemplate\|@KafkaListener\|RabbitTemplate\|@RabbitListener\|SQS\|amqp\|kafka\|bullmq\|celery" 2>/dev/null | \
    sed "s|$PROJECT_ROOT/||g" | head -10)
  [[ -n "$mq_hints" ]] && items+=("{\"type\":\"MESSAGE_QUEUE\",\"files\":[$(echo "$mq_hints" | while read -r f; do printf '\"%s\",' "$f"; done | sed 's/,$//')]}")

  # gRPC
  local grpc_hints
  grpc_hints=$(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" -name "*.proto" 2>/dev/null | head -5 | sed "s|$PROJECT_ROOT/||g")
  [[ -n "$grpc_hints" ]] && items+=("{\"type\":\"gRPC\",\"files\":[$(echo "$grpc_hints" | while read -r f; do printf '\"%s\",' "$f"; done | sed 's/,$//')]}")

  # GraphQL
  local gql_hints
  gql_hints=$(find "$PROJECT_ROOT" -maxdepth "$MAX_DEPTH" \( -name "*.graphql" -o -name "*.gql" \) 2>/dev/null | head -5 | sed "s|$PROJECT_ROOT/||g")
  [[ -n "$gql_hints" ]] && items+=("{\"type\":\"GraphQL\",\"files\":[$(echo "$gql_hints" | while read -r f; do printf '\"%s\",' "$f"; done | sed 's/,$//')]}")

  if [[ ${#items[@]} -gt 0 ]]; then
    echo "[$(IFS=,; echo "${items[*]}")]"
  else
    echo "[]"
  fi
}

# ─── 12. Config Files ────────────────────────────────────────────────────────
detect_config_files() {
  {
    find "$PROJECT_ROOT" -maxdepth 4 \( \
      -name "application.yml" -o -name "application.yaml" -o -name "application.properties" \
      -o -name "application-*.yml" -o -name "application-*.properties" \
      -o -name "appsettings.json" -o -name "appsettings.*.json" \
      -o -name "settings.py" -o -name "config.py" \
      -o -name ".env" -o -name ".env.*" \
      -o -name "docker-compose.yml" -o -name "docker-compose.yaml" -o -name "compose.yml" \
      -o -name "Dockerfile" \
      -o -name "nginx.conf" \
      -o -name "pom.xml" -o -name "build.gradle" -o -name "build.gradle.kts" \
      -o -name "package.json" \
      -o -name "tsconfig.json" \
      -o -name "go.mod" \
      -o -name "Cargo.toml" \
      -o -name "Gemfile" \
      -o -name "composer.json" \
      -o -name "pyproject.toml" \
      -o -name "Makefile" \
      \) 2>/dev/null
  } | sed "s|$PROJECT_ROOT/||g" | sort | json_array_from_lines
}

# ─── 13. File Statistics ─────────────────────────────────────────────────────
get_file_stats() {
  python3 -c "
import os, json, collections

root = '$PROJECT_ROOT'
max_depth = $MAX_DEPTH
skip_dirs = {'node_modules','.git','.svn','__pycache__','target','build','dist','bin','obj','.gradle','.next','.nuxt','vendor','.idea','.vscode'}
ext_count = collections.Counter()
total = 0

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in skip_dirs]
    depth = dirpath.replace(root, '').count(os.sep)
    if depth >= max_depth:
        dirnames.clear()
        continue
    for f in filenames:
        ext = os.path.splitext(f)[1].lower()
        if ext:
            ext_count[ext] += 1
            total += 1

top = dict(ext_count.most_common(15))
print(json.dumps({'total_files': total, 'by_extension': top}))
" 2>/dev/null || echo '{"total_files":0,"by_extension":{}}'
}

# ─── 14. Module Detection ────────────────────────────────────────────────────
detect_modules() {
  local items=()

  # Maven multi-module
  if [[ -f "$PROJECT_ROOT/pom.xml" ]]; then
    grep -oP '(?<=<module>)[^<]+' "$PROJECT_ROOT/pom.xml" 2>/dev/null | while read -r mod; do
      echo "{\"name\":\"$mod\",\"path\":\"$mod\",\"type\":\"maven-module\"}"
    done > "$TMPDIR_SCAN/maven_modules.txt"
    while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/maven_modules.txt"
  fi

  # Gradle multi-module
  for sf in "$PROJECT_ROOT/settings.gradle" "$PROJECT_ROOT/settings.gradle.kts"; do
    [[ -f "$sf" ]] || continue
    grep -oP "include\s+['\"]:\K[^'\":]+" "$sf" 2>/dev/null > "$TMPDIR_SCAN/gradle_modules.txt" || true
    while IFS= read -r mod; do
      items+=("{\"name\":\"$mod\",\"path\":\"$mod\",\"type\":\"gradle-module\"}")
    done < "$TMPDIR_SCAN/gradle_modules.txt"
  done

  # .NET solution projects
  for sln in $(find "$PROJECT_ROOT" -maxdepth 1 -name "*.sln" 2>/dev/null); do
    grep -oP 'Project.*=.*"\K[^"]+(?=\\)' "$sln" 2>/dev/null | while read -r mod; do
      echo "{\"name\":\"$(basename "$mod")\",\"path\":\"$mod\",\"type\":\"dotnet-project\"}"
    done > "$TMPDIR_SCAN/dotnet_modules.txt"
    while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/dotnet_modules.txt"
  done

  # npm workspaces / lerna
  if [[ -f "$PROJECT_ROOT/package.json" ]]; then
    python3 -c "
import json, glob, os
d = json.load(open('$PROJECT_ROOT/package.json'))
ws = d.get('workspaces', [])
if isinstance(ws, dict): ws = ws.get('packages', [])
for pattern in ws:
    for p in glob.glob(os.path.join('$PROJECT_ROOT', pattern)):
        if os.path.isdir(p):
            name = os.path.basename(p)
            rel = os.path.relpath(p, '$PROJECT_ROOT')
            print(json.dumps({'name': name, 'path': rel, 'type': 'npm-workspace'}))
" 2>/dev/null > "$TMPDIR_SCAN/npm_modules.txt"
    while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/npm_modules.txt"
  fi

  # Go workspace
  if [[ -f "$PROJECT_ROOT/go.work" ]]; then
    grep -oP '^\s*use\s+\K\S+' "$PROJECT_ROOT/go.work" 2>/dev/null | while read -r mod; do
      echo "{\"name\":\"$(basename "$mod")\",\"path\":\"$mod\",\"type\":\"go-workspace\"}"
    done > "$TMPDIR_SCAN/go_modules.txt"
    while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/go_modules.txt"
  fi

  # Cargo workspace
  if [[ -f "$PROJECT_ROOT/Cargo.toml" ]] && grep -q "\[workspace\]" "$PROJECT_ROOT/Cargo.toml" 2>/dev/null; then
    grep -oP 'members\s*=\s*\[\s*\K[^\]]+' "$PROJECT_ROOT/Cargo.toml" 2>/dev/null | tr ',' '\n' | tr -d '" ' | while read -r mod; do
      [[ -n "$mod" ]] && echo "{\"name\":\"$(basename "$mod")\",\"path\":\"$mod\",\"type\":\"cargo-workspace\"}"
    done > "$TMPDIR_SCAN/cargo_modules.txt"
    while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/cargo_modules.txt"
  fi

  # Django apps
  for sf in $(find "$PROJECT_ROOT" -maxdepth 3 -name "settings.py" 2>/dev/null | head -3); do
    grep -oP "(?:INSTALLED_APPS|LOCAL_APPS)\s*[\+=]\s*\[([^\]]+)\]" "$sf" 2>/dev/null | \
      grep -oP "'[a-z_]+'" | tr -d "'" | while read -r app; do
        echo "{\"name\":\"$app\",\"path\":\"$app\",\"type\":\"django-app\"}"
      done > "$TMPDIR_SCAN/django_modules.txt"
    while IFS= read -r line; do items+=("$line"); done < "$TMPDIR_SCAN/django_modules.txt"
  done

  if [[ ${#items[@]} -gt 0 ]]; then
    echo "[$(IFS=,; echo "${items[*]}")]"
  else
    echo "[]"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN: Assemble JSON output
# ═══════════════════════════════════════════════════════════════════════════════
echo "{"
echo "  \"project_root\": $(echo "$PROJECT_ROOT" | json_escape),"
echo "  \"scan_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
echo "  \"languages\": $(detect_languages),"
echo "  \"frameworks\": $(detect_frameworks),"
echo "  \"orm\": $(detect_orm),"
echo "  \"databases\": $(detect_database),"
echo "  \"build_tools\": $(detect_build_tool),"
echo "  \"vcs\": $(detect_vcs),"
echo "  \"modules\": $(detect_modules),"
echo "  \"entry_points\": $(detect_entry_points),"
echo "  \"sql_files\": $(detect_sql_files),"
echo "  \"tables\": $(detect_tables),"
echo "  \"erd\": $(detect_erd_relationships),"
echo "  \"integrations\": $(detect_integrations),"
echo "  \"config_files\": $(detect_config_files),"
echo "  \"directory_structure\": $(get_directory_structure),"
echo "  \"file_stats\": $(get_file_stats)"
echo "}"