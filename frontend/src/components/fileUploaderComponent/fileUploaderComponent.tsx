import React from 'react';
import './fileUploadComponent.css';

type PresentationalProps = {
    dragging: boolean;
    file: File | null;
    fileTypeAcceptance: string;
    onDrag: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    onFileChanged: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export class FileUploaderComponent extends React.Component<PresentationalProps> {
    private _fileUploaderInput: HTMLElement | null = null;

    private _onSelectFileClick(): void {
        this._fileUploaderInput && this._fileUploaderInput.click();
    }

    private _getClasses(): string {
        const uploaderClasses = 'file-uploader';
        return this.props.dragging ? uploaderClasses + '--dragging' : uploaderClasses;
    }

    private _getFileName(): string {
        return this.props.file ? this.props.file.name : 'No File Uploaded!';
    }

    private _getDropAreaContent(): JSX.Element {
        const noFileContent = (
            <div className='drop-area-content'>
                <span>Drag & drop file</span>
                <span>or</span>
                <span>Click to select file</span>
            </div>
        );
        const fileChosenContent = (
            <div className='drop-area-content'>
                <span>Drag & drop</span>
                <span>or</span>
                <span>Click to select new file</span>
            </div>
        );
        return this.props.file ? fileChosenContent : noFileContent;
    }

    render(): JSX.Element {
        return (
            <div
                className={this._getClasses()}
                onDrag={this.props.onDrag}
                onDragStart={this.props.onDragStart}
                onDragEnd={this.props.onDragEnd}
                onDragOver={this.props.onDragOver}
                onDragEnter={this.props.onDragEnter}
                onDragLeave={this.props.onDragLeave}
                onDrop={this.props.onDrop}
                onClick={this._onSelectFileClick.bind(this)}
            >
                <div className='file-uploader__contents'>
                    <span className='file-uploader__file-name'>{this._getFileName()}</span>
                    {this._getDropAreaContent()}
                    <input
                        ref={el => (this._fileUploaderInput = el)}
                        type='file'
                        className='file-uploader__input'
                        onChange={this.props.onFileChanged}
                        accept={this.props.fileTypeAcceptance}
                    />
                </div>
            </div>
        );
    }
}
