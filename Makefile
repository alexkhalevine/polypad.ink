.PHONY: dev dev-web dev-server test clean

dev:
	@pnpm --filter web dev &
	@pnpm --filter server dev &
	@wait

dev-web:
	@pnpm --filter web dev

dev-server:
	@pnpm --filter server dev

test:
	@cd apps/web && pnpm test --run

clean:
	@rm -rf node_modules packages/*/node_modules apps/*/node_modules
	@pnpm install
