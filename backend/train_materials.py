"""Train and evaluate a construction-material detector using a real annotated dataset."""
import argparse
import json
from pathlib import Path

MATERIALS = {"slate", "board", "beam", "brick", "block", "pipe"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True, help="YOLO dataset YAML with train/val splits")
    parser.add_argument("--weights", default="yolo11n.pt", help="Pretrained Ultralytics weights or a local checkpoint")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--output", type=Path, default=Path("material-runs"))
    args = parser.parse_args()
    if not args.data.is_file():
        parser.error("A real annotated dataset YAML is required.")
    if not 1 <= args.epochs <= 1000:
        parser.error("epochs must be between 1 and 1000")
    import yaml
    from ultralytics import YOLO
    dataset = yaml.safe_load(args.data.read_text(encoding="utf-8"))
    names = dataset.get("names", {})
    labels = set(names.values() if isinstance(names, dict) else names)
    if not MATERIALS.issubset(labels):
        parser.error("Dataset must include slate, board, beam, brick, block and pipe labels.")
    if not dataset.get("train") or not dataset.get("val"):
        parser.error("Separate train and validation image splits are required.")
    model = YOLO(args.weights)
    model.train(data=str(args.data.resolve()), epochs=args.epochs, imgsz=960, device=args.device,
                project=str(args.output), name="construction", exist_ok=False)
    best = Path(model.trainer.best)
    validation = YOLO(str(best)).val(data=str(args.data.resolve()), split="val", device=args.device)
    report = {"weights": str(best.resolve()), "validation": validation.results_dict,
              "note": "Validate on separate site photographs before enabling production counting."}
    destination = best.parent.parent / "validation.json"
    destination.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(destination)


if __name__ == "__main__":
    main()
