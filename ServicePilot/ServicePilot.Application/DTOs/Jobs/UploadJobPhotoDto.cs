namespace ServicePilot.Application.DTOs.Jobs
{
    public class UploadJobPhotoDto
    {
        /// <summary>Before | After | Progress | Signature</summary>
        public string PhotoType { get; set; } = "Progress";

        /// <summary>
        /// Base64-encoded image data (without data URI prefix).
        /// The service converts this to a data URI for storage.
        /// In production this would be uploaded to Azure Blob / S3 first.
        /// </summary>
        public string PhotoBase64 { get; set; } = string.Empty;

        /// <summary>Original filename hint — used to detect image MIME type.</summary>
        public string? Caption { get; set; }
    }
}
