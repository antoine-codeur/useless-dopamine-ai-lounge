import { Save, X } from "lucide-react";
import { Button, IconButton } from "../../components/Button/Button";

/**
 * Modal that lets the user zoom an uploaded image before it is cropped to a
 * square avatar. Cropping itself is handled by cropAvatar() on save.
 */
export function AvatarModal({
  onCancel,
  onSave,
  onScaleChange,
  scale,
  src,
}: {
  onCancel: () => void;
  onSave: () => void;
  onScaleChange: (value: number) => void;
  scale: number;
  src: string;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onCancel} role="presentation">
      <section
        aria-label="Resize profile picture"
        aria-modal="true"
        className="avatar-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <h2>Resize picture</h2>
            <p>Use the slider, then press Enter or Save.</p>
          </div>
          <IconButton className="icon-button" label="Close" onClick={onCancel} type="button">
            <X size={18} />
          </IconButton>
        </header>
        <div className="crop-preview">
          <img alt="" src={src} style={{ transform: `scale(${scale})` }} />
        </div>
        <label>
          Zoom
          <input
            max="2.2"
            min="1"
            onChange={(event) => onScaleChange(Number(event.currentTarget.value))}
            step="0.01"
            type="range"
            value={scale}
          />
        </label>
        <footer>
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
          <Button onClick={onSave} type="button">
            <Save size={16} />
            Save picture
          </Button>
        </footer>
      </section>
    </div>
  );
}
