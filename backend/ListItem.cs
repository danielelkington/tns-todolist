using System;
namespace backend
{
    public class ListItem
    {
        public string Id { get; set; }
        public string Description { get; set; }
        public bool Complete { get; set; }
        public int ModifiedUTC { get; set; }
    }
}
