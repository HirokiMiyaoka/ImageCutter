interface FileReaderEvent extends ProgressEvent {
    target: FileReader;
}
interface DropFileEvent extends Event {
    image: HTMLImageElement;
    file: File;
}
declare class ImageCutter extends HTMLElement {
    private canvas;
    private drop;
    private image;
    private dragover;
    private dragdrop;
    private cut;
    static aspectRatio(width: number, height: number): number;
    constructor();
    private initImageArea;
    private initDropArea;
    private canvasPosition;
    private canvasScale;
    private inCanvasCorner;
    private resizeCanvas;
    private initResizeArea;
    addDropEvent(element?: HTMLElement): void;
    removeDropEvent(element?: HTMLElement): void;
    private onDrop;
    reset(): void;
    private onLoadImage;
    private updateCanvas;
    getCanvas(): HTMLCanvasElement;
    toDataURL(type?: string, quality?: number): string;
    width: number;
    height: number;
}
