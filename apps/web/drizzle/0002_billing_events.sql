CREATE TABLE "billing_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"event_at" timestamp with time zone NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
