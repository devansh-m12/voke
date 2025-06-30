const uploadFile = async (url: string): Promise<string> => {
    try {
        // First, download the file from the provided URL
        const fileResponse = await fetch(url);
        if (!fileResponse.ok) {
            throw new Error(`Failed to download file: ${fileResponse.statusText}`);
        }
        
        // Get the file as a blob
        const fileBlob = await fileResponse.blob();
        
        // Extract filename from URL or use a default
        const urlPath = new URL(url).pathname;
        const filename = urlPath.split('/').pop() || 'downloaded-file';
        
        // Create FormData and append the file blob
        const formData = new FormData();
        formData.append('files[]', fileBlob, filename);
        
        // Upload to uguu.se using the correct endpoint
        const uploadResponse = await fetch('https://uguu.se/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }
        
        const data = await uploadResponse.json();
        
        // Return the temporary URL - uguu returns array of files
        if (data.success && data.files && data.files.length > 0) {
            return data.files[0].url;
        } else {
            throw new Error('Upload successful but no URL returned');
        }
        
    } catch (error) {
        console.error('Error uploading file to uguu:', error);
        throw error;
    }
}

export { uploadFile};