
interface FileReaderEvent extends ProgressEvent
{
	target: FileReader,
}

interface DropFileEvent extends Event
{
	image: HTMLImageElement,
	file: File,
}

class ImageCutter extends HTMLElement
{
	private canvas: HTMLCanvasElement;
	private drop: HTMLElement;
	private image: HTMLImageElement;
	private dragover: ( event: DragEvent ) => void;
	private dragdrop: ( event: DragEvent ) => void;
	private cut: { top: number, left: number, width: number, height: number };

	static aspectRatio( width: number, height: number ) { return width / height; }

	constructor()
	{
		super();

		if ( this.width <= 0 ) { this.width = 128; }
		if ( this.height <= 0 ) { this.height = 128; }

		this.initImageArea();

		this.initDropArea();

		this.initResizeArea();
	}

	private initImageArea()
	{
		this.cut = { top: 0, left: 0, width: 0, height: 0 };

		const shadow = this.attachShadow( { mode: 'open' } );

		const style = document.createElement( 'style' );
		style.innerHTML = [
			':host { display: block; width: 100%; height: 100%; }',
			':host > div { padding: var( --in-padding, 0.5rem ); box-sizing: border-box; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }',
			'canvas { max-width: 100%; max-height: 100%; display: block; pointer-events: none; }',
		].join( '' );

		this.drop = document.createElement( 'div' );

		this.canvas = document.createElement( 'canvas' );
		this.drop.appendChild( this.canvas );

		shadow.appendChild( style );
		shadow.appendChild( this.drop );
	}

	private initDropArea()
	{
		this.dragover = ( event ) => {
			event.preventDefault();
			event.dataTransfer.dropEffect = 'copy';
			this.drop.classList.add( 'drag' );
		};
		this.dragdrop = ( event ) => {
			event.preventDefault();
			this.drop.classList.remove( 'drag' );
			this.onDrop( event );
		};

		this.addDropEvent();
	}

	private canvasPosition( event: MouseEvent )
	{
		const rect = this.canvas.getBoundingClientRect();
		const x = ( event.pageX - ( rect.left + window.pageXOffset ) ) * this.canvas.width / rect.width;
		const y = ( event.pageY - ( rect.top + window.pageYOffset ) ) * this.canvas.height / rect.height;
		return { x: x, y: y };
	}

	private canvasScale( event: MouseEvent )
	{
		const rect = this.canvas.getBoundingClientRect();
		return this.canvas.width / rect.width;
	}

	private inCanvasCorner( event: MouseEvent )
	{
		const m = this.canvasPosition( event );
		const r = 20;
		const left = this.cut.left;
		const right = this.cut.left + this.cut.width;
		const top = this.cut.top;
		const bottom = this.cut.top + this.cut.height;

		if ( Math.pow( left - m.x, 2 ) + Math.pow( top - m.y, 2 ) <= r * r ) { return 1; }
		if ( Math.pow( right - m.x, 2 ) + Math.pow( top - m.y, 2 ) <= r * r ) { return 2; }
		if ( Math.pow( right - m.x, 2 ) + Math.pow( bottom - m.y, 2 ) <= r * r ) { return 4; }
		if ( Math.pow( left - m.x, 2 ) + Math.pow( bottom - m.y, 2 ) <= r * r ) { return 8; }

		if ( left - r <= m.x && m.x <= right + r )
		{
			if ( top - r <= m.y && m.y <= top + r ) { return 3; }
			if ( bottom - r <= m.y && m.y <= bottom + r ) { return 12; }
		}
		if ( top - r <= m.y && m.y <= bottom + r )
		{
			if ( left - r <= m.x && m.x <= left + r ) { return 9; }
			if ( right - r <= m.x && m.x <= right + r ) { return 6; }
		}

		return 0;
	}

	private resizeCanvas( sx: number | null, sy: number | null, ex: number | null, ey: number | null )
	{
		sx = typeof sx === 'number' ?  Math.floor( sx ) : null;
		sy = typeof sy === 'number' ?  Math.floor( sy ) : null;
		ex = typeof ex === 'number' ?  Math.floor( ex ) : null;
		ey = typeof ey === 'number' ?  Math.floor( ey ) : null;
		const rect = { top: this.cut.top, left: this.cut.left, width: this.cut.width, height: this.cut.height };
		const cutar = ImageCutter.aspectRatio( this.width, this.height );

		if ( sx !== null )
		{
			// Fix value.
			const right = this.cut.left + this.cut.width;
			if ( this.cut.width < sx ) { return; }
			if ( sy !== null )
			{
				// top left
				const bottom = this.cut.top + this.cut.height;
				rect.left = Math.floor( rect.left + sx );
				rect.top = Math.floor( rect.top + sy );
				if ( rect.left < 0 ) { rect.left = 0; }
				if ( rect.top < 0 ) { rect.top = 0; }

				const mouse = ImageCutter.aspectRatio( right - rect.left, bottom - rect.top );
				if ( cutar < mouse )
				{
					// Image width longer than cut = fit height.
					rect.height = bottom - rect.top;
					if ( rect.height < 1 ) { rect.height = 1; }
					rect.width = Math.floor( this.width * rect.height / this.height );
					rect.left = right - rect.width;
				} else
				{
					// Image height longer than cut = fit width.
					rect.width = right - rect.left;
					if ( rect.width < 1 ) { rect.width = 1; }
					rect.height = Math.floor( this.height * rect.width / this.width );
					rect.top = bottom - rect.height;
				}
			} else if ( ey != null )
			{
				// bottom left
				const top = this.cut.top;
				rect.left = Math.floor( rect.left + sx );
				rect.height = Math.floor( rect.height + ey );
				if ( rect.left < 0 ) { rect.left = 0; }
				if ( this.canvas.height < top + rect.height ) { rect.height = this.canvas.height - top; }

				const mouse = ImageCutter.aspectRatio( right - rect.left, rect.height + rect.top );
				if ( cutar < mouse )
				{
					// Image width longer than cut = fit height.
					rect.width = Math.floor( this.width * rect.height / this.height );
					rect.left = right - rect.width;
				} else
				{
					// Image height longer than cut = fit width.
					rect.width = right - rect.left;
					rect.height = Math.floor( this.height * rect.width / this.width );
				}
			} else if ( sy === null && ey === null )
			{
				// left
				rect.left = Math.floor( rect.left + sx );
				rect.width = right - rect.left;
				if ( rect.width < 1 ) { rect.width = 1; }
				rect.height = Math.floor( this.height * rect.width / this.width );
				if ( this.canvas.height < rect.top + rect.height )
				{
					rect.height = this.canvas.height - rect.top;
					if ( rect.height < 1 ) { rect.height = 1; }
					rect.width = Math.floor( this.width * this.cut.width / this.height );
					rect.left = right - rect.width;
				}
			}
		} else if( ex !== null )
		{
			// Fix value.
			const left = this.cut.left;
			if ( this.cut.width < ex ) { return; }
			if ( sy !== null )
			{
				// top right
				const bottom = this.cut.top + this.cut.height;
				rect.width = Math.floor( rect.width + ex );
				if ( rect.width < 1 ) { rect.width = 1; }
				rect.top = Math.floor( rect.top + sy );
				if ( rect.left < 0 ) { rect.left = 0; }
				if ( rect.top < 0 ) { rect.top = 0; }

				const mouse = ImageCutter.aspectRatio( rect.width, bottom - rect.top );
				if ( cutar < mouse )
				{
					// Image width longer than cut = fit height.
					rect.height = bottom - rect.top;
					if ( rect.height < 1 ) { rect.height = 1; }
					rect.width = Math.floor( this.width * rect.height / this.height );
				} else
				{
					// Image height longer than cut = fit width.
					rect.height = Math.floor( this.height * rect.width / this.width );
					rect.top = bottom - rect.height;
				}
			} else if ( ey != null )
			{
				// bottom right
				const top = this.cut.top;
				rect.width = Math.floor( rect.width + ex );
				rect.height = Math.floor( rect.height + ey );
				if ( this.canvas.width < left + rect.width ) { rect.width = this.canvas.width - left; }
				if ( this.canvas.height < top + rect.height ) { rect.height = this.canvas.height - top; }
				if ( rect.width < 1 ) { rect.width = 1; }
				if ( rect.height < 1 ) { rect.height = 1; }

				const mouse = ImageCutter.aspectRatio( rect.width, rect.height );
				if ( cutar < mouse )
				{
					// Image width longer than cut = fit height.
					rect.width = Math.floor( this.width * rect.height / this.height );
				} else
				{
					// Image height longer than cut = fit width.
					rect.height = Math.floor( this.height * rect.width / this.width );
				}
			} else if ( sy === null && ey === null )
			{
				// right
				rect.width = Math.floor( rect.width + ex );
				if ( rect.width < 1 ) { rect.width = 1; }
				rect.height = Math.floor( this.height * rect.width / this.width );
				if ( this.canvas.height < rect.top + rect.height )
				{
					rect.height = this.canvas.height - rect.top;
					rect.width = Math.floor( this.width * this.cut.width / this.height );
				}
			}
		} else if ( sy !== null )
		{
			// top
			const bottom = this.cut.top + this.cut.height;
			rect.top = Math.floor( rect.top + sy );
			if ( rect.top < 0 ) { rect.top = 0; }
			rect.height = bottom - rect.top;
			if ( rect.height < 1 ) { rect.height = 1; }
			rect.width = Math.floor( this.width * rect.height / this.height );
			if ( this.canvas.width < rect.left + rect.width )
			{
				rect.width = this.canvas.width - rect.left;
				rect.height = Math.floor( this.height * this.cut.height / this.width );
			}
		} else if ( ey !== null )
		{
			// bottom
			const top = this.cut.top;
			rect.height = Math.floor( rect.height + ey );
			if ( this.canvas.height < top + rect.height ) { rect.height = this.canvas.height - top; }
			if ( rect.height < 1 ) { rect.height = 1; }
			rect.width = Math.floor( this.width * rect.height / this.height );
			if ( this.canvas.width < rect.left + rect.width )
			{
				rect.width = this.canvas.width - rect.left;
				rect.height = Math.floor( this.height * this.cut.height / this.width );
			}
		}
		this.cut = rect;
	}

	private initResizeArea()
	{
		let down: { x: number, y: number } | null;
		let move: boolean;
		let resize = 0;

		this.drop.addEventListener( 'mousedown', ( event ) =>
		{
			down = this.canvasPosition( event );
			move = this.cut.left <= down.x && down.x <= this.cut.left + this.cut.width && this.cut.top <= down.y && down.y <= this.cut.top + this.cut.height;
			resize = this.inCanvasCorner( event );
		} );

		this.drop.addEventListener( 'mousemove', ( event ) =>
		{
			if ( !down ) { return; }
			const pos = this.canvasPosition( event );
			if( resize )
			{
				// Resize mode.
				switch ( resize )
				{
					case 1: this.resizeCanvas( pos.x - down.x, pos.y - down.y, null, null ); break;
					case 2: this.resizeCanvas( null, pos.y - down.y, pos.x - down.x, null ); break;
					case 4: this.resizeCanvas( null, null, pos.x - down.x, pos.y - down.y ); break;
					case 8: this.resizeCanvas( pos.x - down.x, null, null, pos.y - down.y ); break;
					case 3: this.resizeCanvas( null, pos.y - down.y, null, null ); break;
					case 12: this.resizeCanvas( null, null, null, pos.y - down.y ); break;
					case 6: this.resizeCanvas( null, null, pos.x - down.x, null ); break;
					case 9: this.resizeCanvas( pos.x - down.x, null, null, null ); break;
				}
				down = pos;
			} else if ( move )
			{
				// Move mode.
				const x = ( pos.x - down.x );

				if ( this.cut.left + x <= 0 )
				{
					this.cut.left = 0;
				} else if ( this.cut.left + x + this.cut.width <= this.canvas.width )
				{
					this.cut.left += x;
				} else
				{
					this.cut.left = this.canvas.width - this.cut.width;
				}

				const y = ( pos.y - down.y );
				if ( this.cut.top + y <= 0 )
				{
					this.cut.top = 0;
				} else if ( this.cut.top + y + this.cut.height <= this.canvas.height )
				{
					this.cut.top += y;
				} else
				{
					this.cut.top = this.canvas.height - this.cut.height;
				}

				down = pos;
			}

			this.updateCanvas();
		} );

		const mouseup = ( event: MouseEvent ) =>
		{
			if ( !down ) { return; }
			down = null;
		};

		this.drop.addEventListener( 'mouseup', mouseup );
		this.drop.addEventListener( 'mouseout', mouseup );
	}

	public addDropEvent( element?: HTMLElement )
	{
		if ( !element ) { element = this.drop; }
		element.addEventListener( 'dragover', this.dragover );
		element.addEventListener( 'drop', this.dragdrop );
	}
	public removeDropEvent( element?: HTMLElement )
	{
		if ( !element ) { element = this.drop; }
		element.removeEventListener( 'dragover', this.dragover );
		element.removeEventListener( 'drop', this.dragdrop );
	}

	private onDrop( event: DragEvent )
	{
		if ( !event.dataTransfer ) { return; }
		const file = event.dataTransfer.files[ 0 ];
		const reader = new FileReader();
		reader.onload = ( event: FileReaderEvent ) =>
		{
			const img = document.createElement( 'img' );
			img.onload = () =>
			{
				this.onLoadImage( img );
				const dropevent = <DropFileEvent>new Event( 'dropfile' );
				dropevent.image = img;
				dropevent.file = file;
				this.dispatchEvent( dropevent );
			};
			img.src = <string>event.target.result;
		};
		reader.readAsDataURL( file );
	}

	public reset()
	{
		const cutar = ImageCutter.aspectRatio( this.width, this.height );
		const imgar = ImageCutter.aspectRatio( this.canvas.width, this.canvas.height );
		if ( cutar < imgar )
		{
			// Image width longer than cut = fit height.
			this.cut.top = 0;
			this.cut.height = this.canvas.height;
			this.cut.width = Math.floor( this.canvas.height * cutar );
			this.cut.left = Math.floor( ( this.canvas.width - this.cut.width ) / 2);
		} else
		{
			// Image height longer than cut = fit width.
			this.cut.left = 0;
			this.cut.width = this.canvas.width;
			this.cut.height = Math.floor( this.canvas.width * cutar );
			this.cut.top = Math.floor( ( this.canvas.height - this.cut.height ) / 2 );
		}

		this.updateCanvas();
	}

	private onLoadImage( image: HTMLImageElement )
	{
		this.image = image;

		this.canvas.width = image.naturalWidth;
		this.canvas.height = image.naturalHeight;

		this.reset();
	}

	private updateCanvas()
	{
		const context = <CanvasRenderingContext2D>this.canvas.getContext( '2d' );
		context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
		context.globalAlpha = 1;

		context.drawImage( this.image, 0, 0 );
		context.fillStyle = 'black';
		context.globalAlpha = 0.5;
		context.fillRect( 0, 0, this.cut.left, this.cut.top + this.cut.height );
		context.fillRect( this.cut.left, 0, this.canvas.width - this.cut.left, this.cut.top );
		context.fillRect( this.cut.left + this.cut.width, this.cut.top, this.canvas.width - this.cut.left - this.cut.width, this.canvas.height - this.cut.top );
		context.fillRect( 0, this.cut.top + this.cut.height, this.cut.left + this.cut.width, this.canvas.height - this.cut.top + this.cut.height );
	}

	public getCanvas()
	{
		const out = document.createElement( 'canvas' );
		out.width = this.width;
		out.height = this.height;
		const context = <CanvasRenderingContext2D>out.getContext( '2d' );
		if ( this.pixel ) { context.imageSmoothingEnabled = false; }
		context.drawImage( this.canvas, this.cut.left, this.cut.top, this.cut.width, this.cut.height, 0, 0, this.width, this.height );
		return out;
	}

	public toDataURL( type = 'image/png', quality?: number )
	{
		return this.getCanvas().toDataURL( type, quality );
	}

	get pixel() { return this.hasAttribute( 'pixel' ); }
	set pixel( value ) { if ( !!value ) { this.setAttribute( 'pixel', 'true' ); } else { this.removeAttribute( 'pixel' ); } }
	get width() { return parseInt( this.getAttribute( 'width' ) || '128' ); }
	set width( value ) { this.setAttribute( 'width', value + '' ); }
	get height() { return parseInt( this.getAttribute( 'height' ) || '128' ); }
	set height( value ) { this.setAttribute( 'height', value + '' ); }
}

document.addEventListener( 'DOMContentLoaded', () =>
{
	customElements.define( 'image-cutter', ImageCutter );
} );
