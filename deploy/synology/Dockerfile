FROM node:24-bookworm-slim AS build
WORKDIR /source
COPY packages/contracts packages/contracts
COPY packages/database packages/database
COPY app/web/package.json app/web/package-lock.json app/web/
RUN cd app/web && npm ci
COPY app/web app/web
RUN cd app/web && npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /opt/legal-builder
RUN groupadd --system --gid 10001 legalbuilder && useradd --system --uid 10001 --gid legalbuilder legalbuilder
COPY --from=build --chown=legalbuilder:legalbuilder /source/app/web/.next/standalone ./standalone
COPY --from=build --chown=legalbuilder:legalbuilder /source/app/web/.next/static ./standalone/.next/static
COPY --from=build --chown=legalbuilder:legalbuilder /source/app/web/node_modules ./app/web/node_modules
COPY --from=build --chown=legalbuilder:legalbuilder /source/app/web/scripts ./app/web/scripts
COPY --from=build --chown=legalbuilder:legalbuilder /source/app/web/src ./app/web/src
COPY --from=build --chown=legalbuilder:legalbuilder /source/app/web/package.json ./app/web/package.json
COPY --from=build --chown=legalbuilder:legalbuilder /source/app/web/tsconfig.json ./app/web/tsconfig.json
COPY --from=build --chown=legalbuilder:legalbuilder /source/packages/database ./packages/database
COPY --from=build --chown=legalbuilder:legalbuilder /source/packages/contracts ./packages/contracts
USER legalbuilder
EXPOSE 3000
CMD ["node", "standalone/server.js"]
