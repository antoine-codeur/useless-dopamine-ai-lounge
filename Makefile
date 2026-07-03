.PHONY: install build type-check deploy status logs stop

COMPOSE      := docker compose
UDA_PORT     ?= 8094
PROTOTYPE_ID ?= lounge

install:
	npm install

type-check:
	npm run build

build:
	npm run build

deploy:
	UDA_PORT=$(UDA_PORT) PROTOTYPE_ID=$(PROTOTYPE_ID) $(COMPOSE) up -d --build

status:
	UDA_PORT=$(UDA_PORT) PROTOTYPE_ID=$(PROTOTYPE_ID) $(COMPOSE) ps

logs:
	UDA_PORT=$(UDA_PORT) PROTOTYPE_ID=$(PROTOTYPE_ID) $(COMPOSE) logs --tail=100 -f

stop:
	UDA_PORT=$(UDA_PORT) PROTOTYPE_ID=$(PROTOTYPE_ID) $(COMPOSE) down

