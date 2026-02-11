import time


def run_stub_jobs() -> None:
    print("job: crawl_ajou (stub)", flush=True)
    print("job: crawl_slack (stub)", flush=True)
    print("job: tag_notices (stub)", flush=True)
    print("job: send_alerts (stub)", flush=True)


def main() -> None:
    print("worker started", flush=True)
    while True:
        run_stub_jobs()
        time.sleep(10)


if __name__ == "__main__":
    main()
