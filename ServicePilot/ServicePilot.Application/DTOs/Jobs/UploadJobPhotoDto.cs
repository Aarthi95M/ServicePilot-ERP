using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Jobs
{
    public class UploadJobPhotoDto
    {
        /// <summary>Before | After | Progress | Signature</summary>
        public string PhotoType { get; set; } = string.Empty;

        /// <summary>
        /// URL of the uploaded photo.
        /// In production this would come from Azure Blob / S3 after upload.
        /// For now accepts a URL string directly.
        /// </summary>
        public string PhotoUrl { get; set; } = string.Empty;
    }
}
